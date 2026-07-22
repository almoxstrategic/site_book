"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Check, ChevronsUpDown, FileSpreadsheet, Plus, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { KanbanCard } from "@/components/kanban/kanban-card";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import {
  useBoardData,
  useBoardMutations,
  useCardProgress,
} from "@/hooks/use-board";
import { useSelectedCard } from "@/hooks/use-selected-card";
import { exportSitebooksToExcel } from "@/lib/export-sitebooks";
import { SITE_ATTRIBUTES, type Card, type Column } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL_FILTER = "__all__";

function FilterCombobox({
  value,
  onChange,
  options,
  allLabel,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  allLabel: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const display =
    value === ALL_FILTER
      ? placeholder
      : (options.find((o) => o === value) ?? placeholder);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn(
            "h-9 w-full justify-between font-normal sm:w-[160px]",
            value === ALL_FILTER && "text-slate-500",
            className
          )}
        >
          <span className="truncate">{display}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={allLabel}
                onSelect={() => {
                  onChange(ALL_FILTER);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "h-4 w-4",
                    value === ALL_FILTER ? "opacity-100" : "opacity-0"
                  )}
                />
                {allLabel}
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function KanbanBoard() {
  const { columns, cards, checklist, commentCounts, isLoading, isError } =
    useBoardData();
  const progress = useCardProgress(checklist);
  const {
    addColumn,
    renameColumn,
    removeColumn,
    relocateColumns,
    addCard,
    removeCard,
    relocateCard,
  } = useBoardMutations();
  const { openCard } = useSelectedCard();

  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterState, setFilterState] = useState<string>(ALL_FILTER);
  const [filterAttribute, setFilterAttribute] = useState<string>(ALL_FILTER);
  const [newColumnOpen, setNewColumnOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newCardOpen, setNewCardOpen] = useState<{
    columnId: string;
  } | null>(null);
  const [newCardId, setNewCardId] = useState("");
  const [newCardAttribute, setNewCardAttribute] = useState("");

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const col of columns) map.set(col.id, []);
    for (const card of [...cards].sort((a, b) => a.position - b.position)) {
      const list = map.get(card.column_id) ?? [];
      list.push(card);
      map.set(card.column_id, list);
    }
    return map;
  }, [columns, cards]);

  const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);

  const stateOptions = useMemo(() => {
    const set = new Set<string>();
    for (const card of cards) {
      const uf = card.state?.trim();
      if (uf) set.add(uf);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cards]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  function matchesFilters(card: Card) {
    if (normalizedQuery) {
      const title = (card.title || "").toLowerCase();
      const id = card.id.toLowerCase();
      if (!title.includes(normalizedQuery) && !id.includes(normalizedQuery)) {
        return false;
      }
    }
    if (filterState !== ALL_FILTER && card.state !== filterState) return false;
    if (
      filterAttribute !== ALL_FILTER &&
      card.attribute !== filterAttribute
    ) {
      return false;
    }
    return true;
  }

  const hasActiveBoardFilters =
    !!normalizedQuery ||
    filterState !== ALL_FILTER ||
    filterAttribute !== ALL_FILTER;

  function clearBoardFilters() {
    setSearchQuery("");
    setFilterState(ALL_FILTER);
    setFilterAttribute(ALL_FILTER);
  }

  function isColumnId(id: string) {
    return columns.some((c) => c.id === id);
  }

  function findContainer(id: string) {
    if (isColumnId(id)) return id;
    const card = cards.find((c) => c.id === id);
    return card?.column_id;
  }

  function handleDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id);
    const column = columns.find((c) => c.id === activeId);
    if (column) {
      setActiveColumn(column);
      setActiveCard(null);
      setActiveColumnId(null);
      setOverColumnId(null);
      return;
    }

    const card = cards.find((c) => c.id === activeId);
    setActiveCard(card ?? null);
    setActiveColumn(null);
    setActiveColumnId(card?.column_id ?? null);
    setOverColumnId(card?.column_id ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    if (activeColumn) return;

    const { over } = event;
    if (!over) {
      setOverColumnId(null);
      return;
    }
    const to = findContainer(String(over.id));
    setOverColumnId(to ?? null);
  }

  function handleDragCancel() {
    setActiveCard(null);
    setActiveColumn(null);
    setActiveColumnId(null);
    setOverColumnId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const draggingColumn = activeColumn;
    const fromColumnId = activeColumnId;

    setActiveCard(null);
    setActiveColumn(null);
    setActiveColumnId(null);
    setOverColumnId(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (draggingColumn || isColumnId(activeId)) {
      const oldIndex = columns.findIndex((c) => c.id === activeId);
      let overColumnIdResolved = overId;
      if (!isColumnId(overColumnIdResolved)) {
        overColumnIdResolved = findContainer(overId) ?? "";
      }
      const newIndex = columns.findIndex((c) => c.id === overColumnIdResolved);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

      const orderedIds = arrayMove(columns, oldIndex, newIndex).map((c) => c.id);
      relocateColumns.mutate(orderedIds);
      return;
    }

    const resolvedFrom = fromColumnId ?? findContainer(activeId);
    const toColumnId = findContainer(overId);
    if (!resolvedFrom || !toColumnId) return;

    const targetList = (cardsByColumn.get(toColumnId) ?? []).filter(
      (c) => c.id !== activeId
    );
    let toPosition = targetList.findIndex((c) => c.id === overId);
    if (isColumnId(overId)) {
      toPosition = targetList.length;
    }
    if (toPosition < 0) toPosition = targetList.length;

    const current = cards.find((c) => c.id === activeId);
    if (
      current &&
      current.column_id === toColumnId &&
      current.position === toPosition
    ) {
      return;
    }

    relocateCard.mutate({
      cardId: activeId,
      fromColumnId: resolvedFrom,
      toColumnId,
      toPosition,
    });
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Carregando board…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center text-rose-600">
        Erro ao carregar dados do Supabase. Verifique as variáveis de ambiente.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="mb-4 flex shrink-0 flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
          <p className="text-sm text-slate-600">
            Arraste o cabeçalho da coluna para reordenar. Arraste cards entre
            colunas ou clique para abrir detalhes.
          </p>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="w-full md:w-auto"
              onClick={() => {
                try {
                  const filteredCards = cards.filter(matchesFilters);
                  if (filteredCards.length === 0) {
                    toast.error("Nenhum site para exportar");
                    return;
                  }
                  exportSitebooksToExcel(filteredCards, checklist);
                  toast.success("Arquivo Excel baixado");
                } catch {
                  toast.error("Falha ao exportar para Excel");
                }
              }}
            >
              <FileSpreadsheet /> Exportar para Excel
            </Button>
            <Button
              onClick={() => setNewColumnOpen(true)}
              size="sm"
              className="w-full md:w-auto"
            >
              <Plus /> Nova coluna
            </Button>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full max-w-md min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar site por nome ou ID..."
              className="pl-9"
              aria-label="Buscar site por nome ou ID"
            />
          </div>
          <FilterCombobox
            value={filterState}
            onChange={setFilterState}
            options={stateOptions}
            allLabel="Todas as UFs"
            placeholder="UF"
            searchPlaceholder="Buscar UF…"
            emptyLabel="Nenhuma UF encontrada."
            className="sm:w-[92px]"
            aria-label="Filtrar por UF"
          />
          <FilterCombobox
            value={filterAttribute}
            onChange={setFilterAttribute}
            options={SITE_ATTRIBUTES}
            allLabel="Todos os atributos"
            placeholder="Atributo"
            searchPlaceholder="Buscar atributo…"
            emptyLabel="Nenhum atributo encontrado."
            className="sm:w-[220px]"
            aria-label="Filtrar por atributo"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 gap-1.5 text-slate-600"
            disabled={!hasActiveBoardFilters}
            onClick={clearBoardFilters}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Limpar Filtros
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <SortableContext
            items={columnIds}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex h-full w-full min-w-0 flex-nowrap items-stretch gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-4 [-webkit-overflow-scrolling:touch]">
              {columns.map((column) => {
                const columnCards = (cardsByColumn.get(column.id) ?? []).filter(
                  matchesFilters
                );
                const isDropTarget =
                  !!activeCard &&
                  overColumnId === column.id &&
                  activeColumnId !== column.id;
                return (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    count={columnCards.length}
                    isDropTarget={isDropTarget}
                    onAddCard={() => setNewCardOpen({ columnId: column.id })}
                    onRename={(name) =>
                      renameColumn.mutate({ id: column.id, name })
                    }
                    onDelete={() => {
                      if (
                        confirm(
                          `Excluir a coluna "${column.name}" e todos os cards?`
                        )
                      ) {
                        removeColumn.mutate(column.id);
                      }
                    }}
                  >
                    <SortableContext
                      items={columnCards.map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex flex-col gap-2">
                        {columnCards.map((card) => {
                          const p = progress.get(card.id) ?? {
                            completed: 0,
                            total: 0,
                          };
                          return (
                            <KanbanCard
                              key={card.id}
                              card={card}
                              completed={p.completed}
                              total={p.total}
                              commentCount={commentCounts[card.id] ?? 0}
                              onClick={() => openCard(card.id)}
                              onDelete={() => {
                                if (
                                  confirm(
                                    `Excluir o site ${card.title || card.id}?`
                                  )
                                ) {
                                  removeCard.mutate(card.id);
                                }
                              }}
                            />
                          );
                        })}
                      </div>
                    </SortableContext>
                  </KanbanColumn>
                );
              })}
            </div>
          </SortableContext>
        </div>

        <DragOverlay dropAnimation={null} style={{ cursor: "grabbing" }}>
          {activeColumn ? (
            <KanbanColumn
              column={activeColumn}
              count={(cardsByColumn.get(activeColumn.id) ?? []).length}
              onAddCard={() => {}}
              onRename={() => {}}
              onDelete={() => {}}
              dragOverlay
            >
              <div className="rounded-md border border-dashed border-slate-200 bg-white/60 px-3 py-6 text-center text-xs text-slate-400">
                Reordenando coluna…
              </div>
            </KanbanColumn>
          ) : activeCard ? (
            <KanbanCard
              card={activeCard}
              completed={progress.get(activeCard.id)?.completed ?? 0}
              total={progress.get(activeCard.id)?.total ?? 0}
              commentCount={commentCounts[activeCard.id] ?? 0}
              dragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={newColumnOpen} onOpenChange={setNewColumnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova coluna</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Ex: EM REVISÃO"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newColumnName.trim()) {
                addColumn.mutate(newColumnName.trim(), {
                  onSuccess: () => {
                    setNewColumnName("");
                    setNewColumnOpen(false);
                  },
                });
              }
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewColumnOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={!newColumnName.trim() || addColumn.isPending}
              onClick={() =>
                addColumn.mutate(newColumnName.trim(), {
                  onSuccess: () => {
                    setNewColumnName("");
                    setNewColumnOpen(false);
                  },
                })
              }
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!newCardOpen}
        onOpenChange={(open) => {
          if (!open) {
            setNewCardOpen(null);
            setNewCardId("");
            setNewCardAttribute("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Site Book</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-card-id">ID do site</Label>
              <Input
                id="new-card-id"
                placeholder="Ex: PQB001C-SMSROJ2"
                value={newCardId}
                onChange={(e) => setNewCardId(e.target.value)}
                className="font-mono"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-card-attribute">Atributo</Label>
              <Select
                value={newCardAttribute || undefined}
                onValueChange={setNewCardAttribute}
              >
                <SelectTrigger id="new-card-attribute" className="w-full">
                  <SelectValue placeholder="Selecione o atributo" />
                </SelectTrigger>
                <SelectContent>
                  {SITE_ATTRIBUTES.map((attr) => (
                    <SelectItem key={attr} value={attr}>
                      {attr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewCardOpen(null);
                setNewCardId("");
                setNewCardAttribute("");
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                !newCardId.trim() ||
                !newCardAttribute ||
                !newCardOpen ||
                addCard.isPending
              }
              onClick={() => {
                if (!newCardOpen || !newCardAttribute) return;
                addCard.mutate(
                  {
                    id: newCardId.trim(),
                    columnId: newCardOpen.columnId,
                    attribute: newCardAttribute,
                  },
                  {
                    onSuccess: () => {
                      setNewCardId("");
                      setNewCardAttribute("");
                      setNewCardOpen(null);
                    },
                  }
                );
              }}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { FileSpreadsheet, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KanbanCard } from "@/components/kanban/kanban-card";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import {
  useBoardData,
  useBoardMutations,
  useCardProgress,
} from "@/hooks/use-board";
import { useSelectedCard } from "@/hooks/use-selected-card";
import { exportSitebooksToExcel } from "@/lib/export-sitebooks";
import type { Card } from "@/lib/types";

export function KanbanBoard() {
  const { columns, cards, checklist, commentCounts, isLoading, isError } =
    useBoardData();
  const progress = useCardProgress(checklist);
  const {
    addColumn,
    renameColumn,
    removeColumn,
    addCard,
    removeCard,
    relocateCard,
  } = useBoardMutations();
  const { openCard } = useSelectedCard();

  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [newColumnOpen, setNewColumnOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newCardOpen, setNewCardOpen] = useState<{
    columnId: string;
  } | null>(null);
  const [newCardId, setNewCardId] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
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

  function findContainer(id: string) {
    if (columns.some((c) => c.id === id)) return id;
    const card = cards.find((c) => c.id === id);
    return card?.column_id;
  }

  function handleDragStart(event: DragStartEvent) {
    const card = cards.find((c) => c.id === event.active.id);
    setActiveCard(card ?? null);
    setActiveColumnId(card?.column_id ?? null);
    setOverColumnId(card?.column_id ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
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
    setActiveColumnId(null);
    setOverColumnId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const fromColumnId = activeColumnId;
    setActiveCard(null);
    setActiveColumnId(null);
    setOverColumnId(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const resolvedFrom = fromColumnId ?? findContainer(activeId);
    const toColumnId = findContainer(overId);
    if (!resolvedFrom || !toColumnId) return;

    const targetList = (cardsByColumn.get(toColumnId) ?? []).filter(
      (c) => c.id !== activeId
    );
    let toPosition = targetList.findIndex((c) => c.id === overId);
    if (columns.some((c) => c.id === overId)) {
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
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Arraste cards entre colunas ou reordene na mesma coluna. Clique para
          abrir detalhes.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              try {
                if (cards.length === 0) {
                  toast.error("Nenhum site para exportar");
                  return;
                }
                exportSitebooksToExcel(cards, checklist);
                toast.success("Arquivo Excel baixado");
              } catch {
                toast.error("Falha ao exportar para Excel");
              }
            }}
          >
            <FileSpreadsheet /> Exportar para Excel
          </Button>
          <Button onClick={() => setNewColumnOpen(true)} size="sm">
            <Plus /> Nova coluna
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
        <div className="flex h-0 min-h-0 w-full min-w-0 flex-1 items-stretch gap-4 overflow-x-auto overflow-y-hidden pb-2">
          {columns.map((column) => {
            const columnCards = cardsByColumn.get(column.id) ?? [];
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

        <DragOverlay dropAnimation={null} style={{ cursor: "grabbing" }}>
          {activeCard ? (
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
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Site Book</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Ex: PQB001C-SMSROJ2"
            value={newCardId}
            onChange={(e) => setNewCardId(e.target.value)}
            className="font-mono"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewCardOpen(null);
                setNewCardId("");
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={!newCardId.trim() || !newCardOpen || addCard.isPending}
              onClick={() => {
                if (!newCardOpen) return;
                addCard.mutate(
                  { id: newCardId.trim(), columnId: newCardOpen.columnId },
                  {
                    onSuccess: () => {
                      setNewCardId("");
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

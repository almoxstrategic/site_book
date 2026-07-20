"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronsUpDown,
  Copy,
  FileSpreadsheet,
  Filter,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { useBoardData, useBoardMutations } from "@/hooks/use-board";
import { useSelectedCard } from "@/hooks/use-selected-card";
import {
  checklistItemLabel,
  DEFAULT_CHECKLIST,
} from "@/lib/checklist-defaults";
import {
  exportCrossFilteredReportToExcel,
  exportFilteredReportToExcel,
} from "@/lib/export-sitebooks";
import type { CardChecklistItem, FilterStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL_SITES = "__all_sites__";
const ALL_POSITIONS = "__all_positions__";
const ALL_TASKS = "__all_tasks__";
const NO_TASK = "__no_task__";
const DEFAULT_STATUS: FilterStatus | "all" = "pending";

type ChecklistRow = {
  item: CardChecklistItem;
  siteName: string;
  columnName: string;
  taskLabel: string;
};

type SiteCrossRow = {
  cardId: string;
  siteName: string;
  columnName: string;
  task1Label: string;
  task1Item: CardChecklistItem | null;
  task1Completed: boolean;
  task2Label: string;
  task2Item: CardChecklistItem | null;
  task2Completed: boolean;
};

function statusLabel(isCompleted: boolean) {
  return isCompleted ? "Feito" : "Pendente";
}

function TaskCombobox({
  label,
  value,
  onChange,
  mode,
  excludeValue,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mode: "primary" | "secondary";
  excludeValue?: string;
}) {
  const [open, setOpen] = useState(false);

  const display =
    value === ALL_TASKS
      ? "Todas as tarefas"
      : value === NO_TASK
        ? mode === "secondary"
          ? "Selecionar tarefa…"
          : "Todas as tarefas"
        : value;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-9 w-full justify-between font-normal"
          >
            <span className="truncate">{display}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput placeholder="Buscar tarefa…" />
            <CommandList>
              <CommandEmpty>Nenhuma tarefa encontrada.</CommandEmpty>
              <CommandGroup heading="Geral">
                {mode === "primary" ? (
                  <CommandItem
                    value="Todas as tarefas"
                    onSelect={() => {
                      onChange(ALL_TASKS);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value === ALL_TASKS ? "opacity-100" : "opacity-0"
                      )}
                    />
                    Todas as tarefas
                  </CommandItem>
                ) : (
                  <CommandItem
                    value="Selecionar tarefa secundária"
                    onSelect={() => {
                      onChange(NO_TASK);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value === NO_TASK ? "opacity-100" : "opacity-0"
                      )}
                    />
                    Selecionar tarefa…
                  </CommandItem>
                )}
              </CommandGroup>
              {DEFAULT_CHECKLIST.map((group) => (
                <CommandGroup key={group.category} heading={group.category}>
                  {group.items
                    .filter((item) => item !== excludeValue)
                    .map((itemLabel) => (
                      <CommandItem
                        key={itemLabel}
                        value={itemLabel}
                        onSelect={() => {
                          onChange(itemLabel);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4",
                            value === itemLabel ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="truncate">{itemLabel}</span>
                      </CommandItem>
                    ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function StatusCell({
  item,
  onToggle,
}: {
  item: CardChecklistItem | null;
  onToggle: (checked: boolean) => void;
}) {
  if (!item) {
    return <span className="text-xs text-slate-400">Não encontrada</span>;
  }

  return (
    <div className="flex items-center gap-3">
      <Switch checked={item.is_completed} onCheckedChange={onToggle} />
      <span
        className={
          item.is_completed
            ? "text-xs font-medium text-teal-700"
            : "text-xs font-medium text-amber-700"
        }
      >
        {statusLabel(item.is_completed)}
      </span>
    </div>
  );
}

export function FiltersDashboard() {
  const { columns, cards, checklist, isLoading, isError } = useBoardData();
  const { setChecklist } = useBoardMutations();
  const { openCard } = useSelectedCard();

  const [siteId, setSiteId] = useState<string>(ALL_SITES);
  const [columnId, setColumnId] = useState<string>(ALL_POSITIONS);
  const [task1, setTask1] = useState<string>(ALL_TASKS);
  const [status1, setStatus1] = useState<FilterStatus | "all">(DEFAULT_STATUS);
  const [task2, setTask2] = useState<string>(NO_TASK);
  const [status2, setStatus2] = useState<FilterStatus>("pending");
  const [showSecondFilter, setShowSecondFilter] = useState(false);
  const [siteOpen, setSiteOpen] = useState(false);

  const sortedCards = useMemo(
    () =>
      [...cards].sort((a, b) =>
        (a.title || a.id).localeCompare(b.title || b.id)
      ),
    [cards]
  );

  const titleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cards) map.set(c.id, c.title || c.id);
    return map;
  }, [cards]);

  const columnNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const col of columns) map.set(col.id, col.name);
    return map;
  }, [columns]);

  const columnByCardId = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cards) {
      map.set(c.id, columnNameById.get(c.column_id) ?? "—");
    }
    return map;
  }, [cards, columnNameById]);

  const cardColumnIdById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cards) map.set(c.id, c.column_id);
    return map;
  }, [cards]);

  const checklistByCard = useMemo(() => {
    const map = new Map<string, CardChecklistItem[]>();
    for (const item of checklist) {
      const list = map.get(item.card_id) ?? [];
      list.push(item);
      map.set(item.card_id, list);
    }
    return map;
  }, [checklist]);

  const task1Specific = task1 !== ALL_TASKS && task1 !== NO_TASK;
  const task2Active = task2 !== NO_TASK;
  const isCrossMode = showSecondFilter && task1Specific && task2Active;

  const checklistRows = useMemo(() => {
    if (isCrossMode) return [] as ChecklistRow[];

    return checklist
      .filter((item) => {
        if (siteId !== ALL_SITES && item.card_id !== siteId) return false;

        if (
          columnId !== ALL_POSITIONS &&
          cardColumnIdById.get(item.card_id) !== columnId
        ) {
          return false;
        }

        if (task1Specific && checklistItemLabel(item) !== task1) return false;

        if (status1 === "completed" && !item.is_completed) return false;
        if (status1 === "pending" && item.is_completed) return false;

        return true;
      })
      .sort((a, b) => {
        const nameA = titleById.get(a.card_id) ?? a.card_id;
        const nameB = titleById.get(b.card_id) ?? b.card_id;
        const bySite = nameA.localeCompare(nameB);
        if (bySite !== 0) return bySite;
        return checklistItemLabel(a).localeCompare(checklistItemLabel(b));
      })
      .map((item) => ({
        item,
        siteName: titleById.get(item.card_id) ?? item.card_id,
        columnName: columnByCardId.get(item.card_id) ?? "—",
        taskLabel: checklistItemLabel(item),
      }));
  }, [
    isCrossMode,
    checklist,
    siteId,
    columnId,
    cardColumnIdById,
    task1,
    task1Specific,
    status1,
    titleById,
    columnByCardId,
  ]);

  const crossRows = useMemo(() => {
    if (!isCrossMode) return [] as SiteCrossRow[];

    const wanted1 = status1 === "completed";
    const wanted2 = status2 === "completed";
    const result: SiteCrossRow[] = [];

    for (const card of sortedCards) {
      if (siteId !== ALL_SITES && card.id !== siteId) continue;
      if (columnId !== ALL_POSITIONS && card.column_id !== columnId) continue;

      const items = checklistByCard.get(card.id) ?? [];
      const item1 = items.find((i) => checklistItemLabel(i) === task1) ?? null;
      if (!item1 || item1.is_completed !== wanted1) continue;

      const item2 = items.find((i) => checklistItemLabel(i) === task2) ?? null;
      if (!item2 || item2.is_completed !== wanted2) continue;

      result.push({
        cardId: card.id,
        siteName: card.title || card.id,
        columnName: columnNameById.get(card.column_id) ?? "—",
        task1Label: task1,
        task1Item: item1,
        task1Completed: item1.is_completed,
        task2Label: task2,
        task2Item: item2,
        task2Completed: item2.is_completed,
      });
    }

    return result;
  }, [
    isCrossMode,
    sortedCards,
    siteId,
    columnId,
    checklistByCard,
    task1,
    task2,
    status1,
    status2,
    columnNameById,
  ]);

  const selectedSiteLabel =
    siteId === ALL_SITES
      ? null
      : (sortedCards.find((c) => c.id === siteId)?.title ?? siteId);

  const hasActiveFilters =
    siteId !== ALL_SITES ||
    columnId !== ALL_POSITIONS ||
    task1Specific ||
    task2Active ||
    status1 !== DEFAULT_STATUS ||
    status2 !== "pending" ||
    showSecondFilter;

  const resultCount = isCrossMode ? crossRows.length : checklistRows.length;

  function clearFilters() {
    setSiteId(ALL_SITES);
    setColumnId(ALL_POSITIONS);
    setTask1(ALL_TASKS);
    setStatus1(DEFAULT_STATUS);
    setTask2(NO_TASK);
    setStatus2("pending");
    setShowSecondFilter(false);
  }

  function handleTask1Change(value: string) {
    setTask1(value);
    if (value === task2) setTask2(NO_TASK);
  }

  function removeSecondFilter() {
    setShowSecondFilter(false);
    setTask2(NO_TASK);
    setStatus2("pending");
  }

  async function copySites() {
    if (resultCount === 0) {
      toast.error("Nenhuma linha para copiar");
      return;
    }

    if (isCrossMode) {
      const header = `${task1} - ${statusLabel(status1 === "completed")} AND ${task2} - ${statusLabel(status2 === "completed")}`;
      const text = `${header}\n${crossRows.map((r) => r.siteName).join("\n")}`;
      try {
        await navigator.clipboard.writeText(text);
        toast.success(`${crossRows.length} site(s) copiado(s)`);
      } catch {
        toast.error("Falha ao copiar para a área de transferência");
      }
      return;
    }

    const grouped = checklistRows.reduce<Record<string, string[]>>((acc, r) => {
      const key = `${r.taskLabel} - ${statusLabel(r.item.is_completed)}:`;
      const list = acc[key] ?? [];
      if (!list.includes(r.siteName)) list.push(r.siteName);
      acc[key] = list;
      return acc;
    }, {});

    const text = Object.entries(grouped)
      .map(([header, sites]) => `${header}\n${sites.join("\n")}`)
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${Object.keys(grouped).length} grupo(s) copiado(s)`);
    } catch {
      toast.error("Falha ao copiar para a área de transferência");
    }
  }

  function exportExcel() {
    if (resultCount === 0) {
      toast.error("Nenhuma linha para exportar");
      return;
    }

    try {
      if (isCrossMode) {
        exportCrossFilteredReportToExcel(
          crossRows.map((row) => ({
            siteName: row.siteName,
            columnName: row.columnName,
            task1Label: row.task1Label,
            task1Completed: row.task1Completed,
            task2Label: row.task2Label,
            task2Completed: row.task2Completed,
          }))
        );
      } else {
        exportFilteredReportToExcel(
          checklistRows.map((row) => ({
            nome: row.siteName,
            posicao: row.columnName,
            descricao: row.taskLabel,
            isCompleted: row.item.is_completed,
          }))
        );
      }
      toast.success("Arquivo Excel baixado");
    } catch {
      toast.error("Falha ao exportar para Excel");
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Carregando filtros…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center text-rose-600">
        Erro ao carregar dados.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 pb-8">
      <div className="shrink-0 rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Filter className="h-4 w-4 text-teal-700" />
          Filtros de relatório
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:items-end">
          <div className="space-y-2">
            <Label>Nome do site</Label>
            <Popover open={siteOpen} onOpenChange={setSiteOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={siteOpen}
                  className="h-9 w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {selectedSiteLabel ?? "Todos os sites"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder="Buscar site…" />
                  <CommandList>
                    <CommandEmpty>Nenhum site encontrado.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="Todos os sites"
                        onSelect={() => {
                          setSiteId(ALL_SITES);
                          setSiteOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4",
                            siteId === ALL_SITES ? "opacity-100" : "opacity-0"
                          )}
                        />
                        Todos os sites
                      </CommandItem>
                      {sortedCards.map((c) => {
                        const label = c.title || c.id;
                        return (
                          <CommandItem
                            key={c.id}
                            value={label}
                            onSelect={() => {
                              setSiteId(c.id);
                              setSiteOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "h-4 w-4",
                                siteId === c.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="truncate">{label}</span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Posição</Label>
            <Select value={columnId} onValueChange={setColumnId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todas as posições" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_POSITIONS}>Todas as posições</SelectItem>
                {columns.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TaskCombobox
            label={showSecondFilter ? "Tarefa 1" : "Tarefa"}
            value={task1}
            onChange={handleTask1Change}
            mode="primary"
            excludeValue={task2Active ? task2 : undefined}
          />

          <div className="space-y-2">
            <Label>{showSecondFilter ? "Status 1" : "Status"}</Label>
            <Select
              value={
                showSecondFilter && status1 === "all" ? "pending" : status1
              }
              onValueChange={(v) => setStatus1(v as FilterStatus | "all")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="completed">Feito</SelectItem>
                {!showSecondFilter && (
                  <SelectItem value="all">Todos</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {showSecondFilter && (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:items-end">
            <div className="hidden xl:col-span-2 xl:block" />
            <TaskCombobox
              label="Tarefa 2"
              value={task2}
              onChange={setTask2}
              mode="secondary"
              excludeValue={task1Specific ? task1 : undefined}
            />
            <div className="space-y-2">
              <Label>Status 2</Label>
              <Select
                value={status2}
                onValueChange={(v) => setStatus2(v as FilterStatus)}
                disabled={!task2Active}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="completed">Feito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!showSecondFilter ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-teal-800 hover:bg-teal-50 hover:text-teal-900"
              onClick={() => {
                setShowSecondFilter(true);
                if (status1 === "all") setStatus1("pending");
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar novo filtro
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-slate-600 hover:bg-slate-100"
              onClick={removeSecondFilter}
            >
              <X className="h-3.5 w-3.5" />
              Remover filtro cruzado
            </Button>
          )}
          {showSecondFilter && (
            <p className="text-xs text-slate-500">
              {isCrossMode
                ? "Filtro cruzado (AND) ativo: cada linha é um site que satisfaz as duas condições."
                : "Selecione Tarefa 1 e Tarefa 2 específicas para aplicar o cruzamento."}
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-row flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            <RotateCcw /> Limpar Filtros
          </Button>
          <Button
            variant="secondary"
            onClick={copySites}
            disabled={resultCount === 0}
          >
            <Copy /> Copiar Sites
          </Button>
          <Button
            variant="secondary"
            onClick={exportExcel}
            disabled={resultCount === 0}
          >
            <FileSpreadsheet /> Exportar para Excel
          </Button>
        </div>
      </div>

      <div className="flex min-h-[60vh] flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Resultados</p>
            <p className="text-xs text-slate-500">
              {isCrossMode
                ? `${crossRows.length} site(s) · filtro cruzado · alterações sincronizam com o Kanban`
                : `${checklistRows.length} linha(s) · filtros básicos · alterações sincronizam com o Kanban`}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          {isCrossMode ? (
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 shadow-[0_1px_0_0_rgb(241_245_249)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome do Site</th>
                  <th className="px-4 py-3 font-medium">Posição</th>
                  <th className="px-4 py-3 font-medium">Tarefa 1</th>
                  <th className="px-4 py-3 font-medium">Status 1</th>
                  <th className="px-4 py-3 font-medium">Tarefa 2</th>
                  <th className="px-4 py-3 font-medium">Status 2</th>
                </tr>
              </thead>
              <tbody>
                {crossRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-slate-400"
                    >
                      Nenhum site atende às duas condições ao mesmo tempo.
                    </td>
                  </tr>
                )}
                {crossRows.map((row) => (
                  <tr
                    key={row.cardId}
                    className="border-t border-slate-100 transition hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-slate-900">
                      <button
                        type="button"
                        onClick={() => openCard(row.cardId)}
                        className="rounded-sm text-left underline-offset-2 transition hover:text-teal-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 focus-visible:ring-offset-2"
                      >
                        {row.siteName}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.columnName}</td>
                    <td className="px-4 py-3 text-slate-600">{row.task1Label}</td>
                    <td className="px-4 py-3">
                      <StatusCell
                        item={row.task1Item}
                        onToggle={(checked) => {
                          if (!row.task1Item) return;
                          setChecklist.mutate({
                            itemId: row.task1Item.id,
                            isCompleted: checked,
                          });
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.task2Label}</td>
                    <td className="px-4 py-3">
                      <StatusCell
                        item={row.task2Item}
                        onToggle={(checked) => {
                          if (!row.task2Item) return;
                          setChecklist.mutate({
                            itemId: row.task2Item.id,
                            isCompleted: checked,
                          });
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 shadow-[0_1px_0_0_rgb(241_245_249)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome do Site</th>
                  <th className="px-4 py-3 font-medium">Posição</th>
                  <th className="px-4 py-3 font-medium">Tarefa</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {checklistRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-slate-400"
                    >
                      Nenhum resultado para a combinação de filtros atual.
                    </td>
                  </tr>
                )}
                {checklistRows.map((row) => (
                  <tr
                    key={row.item.id}
                    className="border-t border-slate-100 transition hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-slate-900">
                      <button
                        type="button"
                        onClick={() => openCard(row.item.card_id)}
                        className="rounded-sm text-left underline-offset-2 transition hover:text-teal-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 focus-visible:ring-offset-2"
                      >
                        {row.siteName}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.columnName}</td>
                    <td className="px-4 py-3 text-slate-600">{row.taskLabel}</td>
                    <td className="px-4 py-3">
                      <StatusCell
                        item={row.item}
                        onToggle={(checked) =>
                          setChecklist.mutate({
                            itemId: row.item.id,
                            isCompleted: checked,
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

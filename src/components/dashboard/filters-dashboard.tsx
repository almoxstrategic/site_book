"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronsUpDown,
  Copy,
  FileSpreadsheet,
  Filter,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { exportFilteredReportToExcel } from "@/lib/export-sitebooks";
import type { FilterStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL_SITES = "__all_sites__";
const ALL_TASKS = "__all_tasks__";
const DEFAULT_STATUS: FilterStatus | "all" = "pending";

function statusLabel(isCompleted: boolean) {
  return isCompleted ? "Feito" : "Pendente";
}

export function FiltersDashboard() {
  const { cards, checklist, isLoading, isError } = useBoardData();
  const { setChecklist } = useBoardMutations();
  const { openCard } = useSelectedCard();

  const [siteQuery, setSiteQuery] = useState("");
  const [siteId, setSiteId] = useState<string>(ALL_SITES);
  const [taskLabel, setTaskLabel] = useState<string>(ALL_TASKS);
  const [status, setStatus] = useState<FilterStatus | "all">(DEFAULT_STATUS);
  const [taskOpen, setTaskOpen] = useState(false);

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

  const rows = useMemo(() => {
    const q = siteQuery.trim().toLowerCase();

    return checklist
      .filter((item) => {
        if (siteId !== ALL_SITES && item.card_id !== siteId) return false;

        if (q) {
          const name = (titleById.get(item.card_id) ?? item.card_id).toLowerCase();
          if (!name.includes(q) && !item.card_id.toLowerCase().includes(q)) {
            return false;
          }
        }

        if (
          taskLabel !== ALL_TASKS &&
          checklistItemLabel(item) !== taskLabel
        ) {
          return false;
        }

        if (status === "completed" && !item.is_completed) return false;
        if (status === "pending" && item.is_completed) return false;

        return true;
      })
      .sort((a, b) => {
        const nameA = titleById.get(a.card_id) ?? a.card_id;
        const nameB = titleById.get(b.card_id) ?? b.card_id;
        const bySite = nameA.localeCompare(nameB);
        if (bySite !== 0) return bySite;
        const labelA = checklistItemLabel(a);
        const labelB = checklistItemLabel(b);
        return labelA.localeCompare(labelB);
      });
  }, [checklist, siteId, siteQuery, taskLabel, status, titleById]);

  const selectedTaskLabel = taskLabel === ALL_TASKS ? null : taskLabel;

  const hasActiveFilters =
    siteQuery.trim() !== "" ||
    siteId !== ALL_SITES ||
    taskLabel !== ALL_TASKS ||
    status !== DEFAULT_STATUS;

  function clearFilters() {
    setSiteQuery("");
    setSiteId(ALL_SITES);
    setTaskLabel(ALL_TASKS);
    setStatus(DEFAULT_STATUS);
  }

  async function copySites() {
    if (rows.length === 0) {
      toast.error("Nenhuma linha para copiar");
      return;
    }

    const grouped = rows.reduce<Record<string, string[]>>((acc, r) => {
      const task = checklistItemLabel(r) || selectedTaskLabel || "Tarefa";
      const key = `${task} - ${statusLabel(r.is_completed)}:`;
      const site = titleById.get(r.card_id) ?? r.card_id;
      const list = acc[key] ?? [];
      if (!list.includes(site)) list.push(site);
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
    if (rows.length === 0) {
      toast.error("Nenhuma linha para exportar");
      return;
    }

    try {
      exportFilteredReportToExcel(
        rows.map((row) => ({
          nome: titleById.get(row.card_id) ?? row.card_id,
          descricao:
            checklistItemLabel(row) || selectedTaskLabel || "—",
          isCompleted: row.is_completed,
        }))
      );
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
    <div className="flex h-auto flex-col gap-4 pb-8 md:h-full md:min-h-0 md:overflow-hidden md:pb-0">
      <div className="h-fit shrink-0 rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Filter className="h-4 w-4 text-teal-700" />
          Filtros de relatório
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.1fr_1.2fr_0.9fr_auto] xl:items-end">
          <div className="space-y-2">
            <Label htmlFor="site-filter">Nome do site</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={siteId}
                onValueChange={(v) => {
                  setSiteId(v);
                  if (v !== ALL_SITES) setSiteQuery("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos os sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SITES}>Todos os sites</SelectItem>
                  {sortedCards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title || c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="site-filter"
                placeholder="Buscar por nome…"
                value={siteQuery}
                onChange={(e) => {
                  setSiteQuery(e.target.value);
                  if (e.target.value.trim()) setSiteId(ALL_SITES);
                }}
                className="sm:max-w-[200px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tarefa</Label>
            <Popover open={taskOpen} onOpenChange={setTaskOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={taskOpen}
                  className="h-9 w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {taskLabel === ALL_TASKS ? "Todas as tarefas" : taskLabel}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder="Buscar tarefa…" />
                  <CommandList>
                    <CommandEmpty>Nenhuma tarefa encontrada.</CommandEmpty>
                    <CommandGroup heading="Geral">
                      <CommandItem
                        value="Todas as tarefas"
                        onSelect={() => {
                          setTaskLabel(ALL_TASKS);
                          setTaskOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4",
                            taskLabel === ALL_TASKS
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        Todas as tarefas
                      </CommandItem>
                    </CommandGroup>
                    {DEFAULT_CHECKLIST.map((group) => (
                      <CommandGroup
                        key={group.category}
                        heading={group.category}
                      >
                        {group.items.map((label) => (
                          <CommandItem
                            key={label}
                            value={label}
                            onSelect={() => {
                              setTaskLabel(label);
                              setTaskOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "h-4 w-4",
                                taskLabel === label
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span className="truncate">{label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as FilterStatus | "all")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="completed">Feito</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
            <Button
              variant="outline"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="w-full xl:w-auto"
            >
              <RotateCcw /> Limpar Filtros
            </Button>
            <Button
              variant="secondary"
              onClick={copySites}
              disabled={rows.length === 0}
              className="w-full xl:w-auto"
            >
              <Copy /> Copiar Sites
            </Button>
            <Button
              variant="secondary"
              onClick={exportExcel}
              disabled={rows.length === 0}
              className="w-full xl:w-auto"
            >
              <FileSpreadsheet /> Exportar para Excel
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-auto flex-col overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm md:min-h-0 md:flex-1 md:overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Resultados</p>
            <p className="text-xs text-slate-500">
              {rows.length} linha(s) · os 3 filtros atuam em conjunto ·
              alterações sincronizam com o Kanban
            </p>
          </div>
        </div>

        <div className="overflow-x-auto md:min-h-0 md:flex-1 md:overflow-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 shadow-[0_1px_0_0_rgb(241_245_249)]">
              <tr>
                <th className="px-4 py-3 font-medium">Nome do Site</th>
                <th className="px-4 py-3 font-medium">Tarefa</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    Nenhum resultado para a combinação de filtros atual.
                  </td>
                </tr>
              )}
              {rows.map((row) => {
                const siteName = titleById.get(row.card_id) ?? row.card_id;
                const rowTaskLabel =
                  checklistItemLabel(row) || selectedTaskLabel || "—";
                return (
                  <tr
                    key={row.id}
                    className="border-t border-slate-100 transition hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-slate-900">
                      <button
                        type="button"
                        onClick={() => openCard(row.card_id)}
                        className="rounded-sm text-left underline-offset-2 transition hover:text-teal-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 focus-visible:ring-offset-2"
                      >
                        {siteName}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{rowTaskLabel}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={row.is_completed}
                          onCheckedChange={(checked) =>
                            setChecklist.mutate({
                              itemId: row.id,
                              isCompleted: checked,
                            })
                          }
                        />
                        <span
                          className={
                            row.is_completed
                              ? "text-xs font-medium text-teal-700"
                              : "text-xs font-medium text-amber-700"
                          }
                        >
                          {statusLabel(row.is_completed)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

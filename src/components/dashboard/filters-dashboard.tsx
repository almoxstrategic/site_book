"use client";

import { useMemo, useState } from "react";
import { Copy, Filter } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBoardData, useBoardMutations } from "@/hooks/use-board";
import type { FilterStatus } from "@/lib/types";

const ALL_SITES = "__all_sites__";
const ALL_TASKS = "__all_tasks__";

function statusLabel(isCompleted: boolean) {
  return isCompleted ? "Marcado" : "Não marcado";
}

export function FiltersDashboard() {
  const { cards, checklist, templates, isLoading, isError } = useBoardData();
  const { setChecklist } = useBoardMutations();

  const [siteQuery, setSiteQuery] = useState("");
  const [siteId, setSiteId] = useState<string>(ALL_SITES);
  const [templateId, setTemplateId] = useState<string>(ALL_TASKS);
  const [status, setStatus] = useState<FilterStatus | "all">("pending");

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

  const templatesByCategory = useMemo(() => {
    const map = new Map<string, typeof templates>();
    for (const t of templates) {
      const cat = t.checklist_categories?.name ?? "Outros";
      const list = map.get(cat) ?? [];
      list.push(t);
      map.set(cat, list);
    }
    return map;
  }, [templates]);

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

        if (templateId !== ALL_TASKS && item.template_id !== templateId) {
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
        const labelA = a.checklist_templates?.label ?? "";
        const labelB = b.checklist_templates?.label ?? "";
        return labelA.localeCompare(labelB);
      });
  }, [checklist, siteId, siteQuery, templateId, status, titleById]);

  const selectedTaskLabel =
    templateId === ALL_TASKS
      ? null
      : (templates.find((t) => t.id === templateId)?.label ?? null);

  async function copySites() {
    if (rows.length === 0) {
      toast.error("Nenhuma linha para copiar");
      return;
    }

    const text = rows
      .map((r) => {
        const site = titleById.get(r.card_id) ?? r.card_id;
        const task =
          r.checklist_templates?.label ?? selectedTaskLabel ?? "Tarefa";
        return `${site} - ${task} - ${statusLabel(r.is_completed)}`;
      })
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${rows.length} linha(s) copiada(s)`);
    } catch {
      toast.error("Falha ao copiar para a área de transferência");
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center text-slate-500">
        Carregando filtros…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[40vh] items-center justify-center text-rose-600">
        Erro ao carregar dados.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5">
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
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todas as tarefas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TASKS}>Todas as tarefas</SelectItem>
                {[...templatesByCategory.entries()].map(([cat, items]) => (
                  <SelectGroup key={cat}>
                    <SelectLabel>{cat}</SelectLabel>
                    {items.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
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
                <SelectItem value="pending">Não marcados</SelectItem>
                <SelectItem value="completed">Marcados</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="secondary"
            onClick={copySites}
            disabled={rows.length === 0}
            className="w-full xl:w-auto"
          >
            <Copy /> Copiar Sites
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Resultados</p>
            <p className="text-xs text-slate-500">
              {rows.length} linha(s) · os 3 filtros atuam em conjunto ·
              alterações sincronizam com o Kanban
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
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
                const taskLabel =
                  row.checklist_templates?.label ?? selectedTaskLabel ?? "—";
                return (
                  <tr
                    key={row.id}
                    className="border-t border-slate-100 transition hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-slate-900">
                      {siteName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{taskLabel}</td>
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

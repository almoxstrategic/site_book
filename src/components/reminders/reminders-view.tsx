"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bell,
  Calendar,
  Check,
  ChevronsUpDown,
  CheckCircle2,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useBoardData } from "@/hooks/use-board";
import { useSelectedCard } from "@/hooks/use-selected-card";
import {
  completeSiteReminder,
  createSiteReminder,
  deleteSiteReminder,
  fetchPendingReminders,
  updateSiteReminder,
} from "@/lib/api";
import type { SiteReminder } from "@/lib/types";
import { tryGetCompanySlug } from "@/lib/company-scope";
import { cn } from "@/lib/utils";

const companyPart = () => tryGetCompanySlug() ?? "none";

export const remindersQueryKey = () =>
  ["site-reminders", "pending", companyPart()] as const;
export const dueRemindersCountKey = () =>
  ["site-reminders", "due-count", companyPart()] as const;

function siteLabel(reminder: SiteReminder) {
  return reminder.cards?.title?.trim() || reminder.site_id;
}

function dueMeta(reminderDate: string) {
  const today = startOfDay(new Date());
  const due = startOfDay(parseISO(reminderDate));
  const days = differenceInCalendarDays(due, today);
  const formatted = format(due, "dd/MM/yyyy", { locale: ptBR });

  if (days > 0) {
    return {
      formatted,
      label: days === 1 ? "Falta 1 Dia" : `Faltam ${days} Dias`,
      className: "text-teal-700",
    };
  }
  if (days === 0) {
    return {
      formatted,
      label: "Vence Hoje",
      className: "text-amber-700 font-medium",
    };
  }
  const overdue = Math.abs(days);
  return {
    formatted,
    label:
      overdue === 1 ? "Atrasado há 1 dia" : `Atrasado há ${overdue} dias`,
    className: "text-rose-600 font-medium",
  };
}

function SiteCombobox({
  value,
  onChange,
  sites,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  sites: { id: string; title: string }[];
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = sites.find((s) => s.id === value);
  const display = selected
    ? selected.title || selected.id
    : "Selecionar site…";

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Site</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-9 w-full justify-between font-normal"
          >
            <span className="truncate">{display}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] z-[60] p-0">
          <Command>
            <CommandInput placeholder="Buscar site…" />
            <CommandList>
              <CommandEmpty>Nenhum site encontrado.</CommandEmpty>
              <CommandGroup>
                {sites.map((site) => (
                  <CommandItem
                    key={site.id}
                    value={`${site.title} ${site.id}`}
                    onSelect={() => {
                      onChange(site.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value === site.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate font-mono text-sm">
                      {site.title || site.id}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

type ReminderFormFields = {
  siteId: string;
  description: string;
  reminderDate: string;
};

function ReminderFields({
  values,
  onChange,
  sites,
  idPrefix,
}: {
  values: ReminderFormFields;
  onChange: (next: ReminderFormFields) => void;
  sites: { id: string; title: string }[];
  idPrefix: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SiteCombobox
        id={`${idPrefix}-site`}
        value={values.siteId}
        onChange={(siteId) => onChange({ ...values, siteId })}
        sites={sites}
      />

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-date`}>Data do lembrete</Label>
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id={`${idPrefix}-date`}
            type="date"
            value={values.reminderDate}
            onChange={(e) =>
              onChange({ ...values, reminderDate: e.target.value })
            }
            className="h-9 pl-9"
          />
        </div>
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-description`}>Descrição</Label>
        <Input
          id={`${idPrefix}-description`}
          value={values.description}
          onChange={(e) =>
            onChange({ ...values, description: e.target.value })
          }
          placeholder="Ex: Laudo de concretagem"
          className="h-9"
        />
      </div>
    </div>
  );
}

function normalizeReminderDate(value: string) {
  return value.slice(0, 10);
}

export function RemindersView() {
  const qc = useQueryClient();
  const { cards, isLoading: cardsLoading } = useBoardData();
  const { openCard } = useSelectedCard();

  const [createForm, setCreateForm] = useState<ReminderFormFields>({
    siteId: "",
    description: "",
    reminderDate: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [editing, setEditing] = useState<SiteReminder | null>(null);
  const [editForm, setEditForm] = useState<ReminderFormFields>({
    siteId: "",
    description: "",
    reminderDate: "",
  });

  const sites = useMemo(
    () =>
      [...cards]
        .map((c) => ({ id: c.id, title: c.title || c.id }))
        .sort((a, b) => a.title.localeCompare(b.title, "pt-BR")),
    [cards]
  );

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: remindersQueryKey(),
    queryFn: fetchPendingReminders,
    enabled: !!tryGetCompanySlug(),
    staleTime: 30_000,
  });

  const filteredReminders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reminders;
    return reminders.filter((reminder) => {
      const name = siteLabel(reminder).toLowerCase();
      const description = (reminder.description || "").toLowerCase();
      return name.includes(q) || description.includes(q);
    });
  }, [reminders, searchQuery]);

  function invalidateReminders() {
    qc.invalidateQueries({ queryKey: remindersQueryKey() });
    qc.invalidateQueries({ queryKey: dueRemindersCountKey() });
  }

  const createReminder = useMutation({
    mutationFn: createSiteReminder,
    onSuccess: () => {
      invalidateReminders();
      setCreateForm({ siteId: "", description: "", reminderDate: "" });
      toast.success("Lembrete salvo");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao salvar lembrete"),
  });

  const updateReminder = useMutation({
    mutationFn: updateSiteReminder,
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: remindersQueryKey() });
      const previous = qc.getQueryData<SiteReminder[]>(remindersQueryKey());
      const site = sites.find((s) => s.id === vars.siteId);
      qc.setQueryData<SiteReminder[]>(remindersQueryKey(), (old = []) =>
        old
          .map((r) =>
            r.id === vars.id
              ? {
                  ...r,
                  site_id: vars.siteId,
                  description: vars.description.trim(),
                  reminder_date: vars.reminderDate,
                  cards: site
                    ? { id: site.id, title: site.title }
                    : r.cards,
                }
              : r
          )
          .sort((a, b) => a.reminder_date.localeCompare(b.reminder_date))
      );
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(remindersQueryKey(), ctx.previous);
      toast.error(e.message || "Erro ao atualizar lembrete");
    },
    onSuccess: () => {
      setEditing(null);
      toast.success("Lembrete atualizado");
    },
    onSettled: invalidateReminders,
  });

  const completeReminder = useMutation({
    mutationFn: completeSiteReminder,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: remindersQueryKey() });
      const previous = qc.getQueryData<SiteReminder[]>(remindersQueryKey());
      qc.setQueryData<SiteReminder[]>(remindersQueryKey(), (old = []) =>
        old.filter((r) => r.id !== id)
      );
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(remindersQueryKey(), ctx.previous);
      toast.error(e.message || "Erro ao concluir lembrete");
    },
    onSuccess: () => toast.success("Lembrete concluído"),
    onSettled: invalidateReminders,
  });

  const removeReminder = useMutation({
    mutationFn: deleteSiteReminder,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: remindersQueryKey() });
      const previous = qc.getQueryData<SiteReminder[]>(remindersQueryKey());
      qc.setQueryData<SiteReminder[]>(remindersQueryKey(), (old = []) =>
        old.filter((r) => r.id !== id)
      );
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(remindersQueryKey(), ctx.previous);
      toast.error(e.message || "Erro ao excluir lembrete");
    },
    onSuccess: () => toast.success("Lembrete excluído"),
    onSettled: invalidateReminders,
  });

  function validateForm(form: ReminderFormFields) {
    if (!form.siteId) {
      toast.error("Selecione um site");
      return false;
    }
    if (!form.description.trim()) {
      toast.error("Informe a descrição");
      return false;
    }
    if (!form.reminderDate) {
      toast.error("Informe a data do lembrete");
      return false;
    }
    return true;
  }

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!validateForm(createForm)) return;
    createReminder.mutate({
      siteId: createForm.siteId,
      description: createForm.description.trim(),
      reminderDate: createForm.reminderDate,
    });
  }

  function openEdit(reminder: SiteReminder) {
    setEditing(reminder);
    setEditForm({
      siteId: reminder.site_id,
      description: reminder.description,
      reminderDate: normalizeReminderDate(reminder.reminder_date),
    });
  }

  function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editing || !validateForm(editForm)) return;
    updateReminder.mutate({
      id: editing.id,
      siteId: editForm.siteId,
      description: editForm.description.trim(),
      reminderDate: editForm.reminderDate,
    });
  }

  function handleDelete(reminder: SiteReminder) {
    if (!window.confirm("Tem certeza que deseja excluir este lembrete?")) {
      return;
    }
    removeReminder.mutate(reminder.id);
  }

  const actionsPending =
    completeReminder.isPending ||
    removeReminder.isPending ||
    updateReminder.isPending;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <form
        onSubmit={handleCreate}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Bell className="h-4 w-4 text-slate-500" />
          Novo lembrete
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <SiteCombobox
            id="create-site"
            value={createForm.siteId}
            onChange={(siteId) => setCreateForm((f) => ({ ...f, siteId }))}
            sites={sites}
          />

          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="create-description">Descrição</Label>
            <Input
              id="create-description"
              value={createForm.description}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Ex: Laudo de concretagem"
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-date">Data do lembrete</Label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="create-date"
                type="date"
                value={createForm.reminderDate}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    reminderDate: e.target.value,
                  }))
                }
                className="h-9 pl-9"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="h-9"
            disabled={
              createReminder.isPending || cardsLoading || sites.length === 0
            }
          >
            Salvar Lembrete
          </Button>
        </div>
      </form>

      <div className="flex min-h-[50vh] flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="shrink-0 space-y-3 border-b border-slate-100 px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por nome do site ou descrição..."
              className="h-9 pl-9"
              aria-label="Pesquisar lembretes"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Lembretes pendentes
            </p>
            <p className="text-xs text-slate-500">
              {isLoading
                ? "Carregando…"
                : searchQuery.trim()
                  ? `${filteredReminders.length} de ${reminders.length} lembrete(s)`
                  : `${reminders.length} lembrete(s) · ordenados pela data mais próxima`}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-slate-400">
              Carregando lembretes…
            </p>
          ) : reminders.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              Nenhum lembrete pendente.
            </p>
          ) : filteredReminders.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              Nenhum lembrete corresponde à busca.
            </p>
          ) : (
            <ul className="space-y-3">
              {filteredReminders.map((reminder) => {
                const meta = dueMeta(reminder.reminder_date);
                const name = siteLabel(reminder);
                return (
                  <li
                    key={reminder.id}
                    className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm leading-snug text-slate-800">
                        <button
                          type="button"
                          onClick={() => openCard(reminder.site_id)}
                          className="font-mono font-semibold text-slate-900 underline-offset-2 hover:text-teal-800 hover:underline"
                        >
                          {name}
                        </button>
                        <span className="text-slate-400"> — </span>
                        <span>{reminder.description}</span>
                        <span className="text-slate-400"> — </span>
                        <span className="tabular-nums text-slate-600">
                          {meta.formatted}
                        </span>
                        <span className="text-slate-400"> — </span>
                        <span className={cn("tabular-nums", meta.className)}>
                          {meta.label}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-teal-200 text-teal-800 hover:bg-teal-50"
                        disabled={actionsPending}
                        onClick={() => completeReminder.mutate(reminder.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Concluir
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-slate-600"
                        disabled={actionsPending}
                        onClick={() => openEdit(reminder)}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        disabled={actionsPending}
                        onClick={() => handleDelete(reminder)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogTitle>Editar lembrete</DialogTitle>
          <form onSubmit={handleUpdate} className="space-y-4">
            <ReminderFields
              idPrefix="edit"
              values={editForm}
              onChange={setEditForm}
              sites={sites}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
                disabled={updateReminder.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateReminder.isPending}>
                Salvar Alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

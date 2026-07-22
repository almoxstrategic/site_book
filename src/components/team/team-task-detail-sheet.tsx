"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { List, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChecklistEditor } from "@/components/checklist/checklist-editor";
import { ImportTeamChecklistDialog } from "@/components/team/import-team-checklist-dialog";
import {
  createTeamChecklistItem,
  createTeamChecklistItemsBulk,
  createTeamChecklistSection,
  deleteTeamChecklistItem,
  deleteTeamChecklistSection,
  fetchTeamTaskChecklist,
  toggleTeamChecklistItem,
  updateTeamChecklistItemLabel,
  updateTeamChecklistSection,
  updateTeamTaskDetails,
} from "@/lib/api";
import {
  TEAM_TASK_STATUS_LABELS,
  type TeamTask,
} from "@/lib/types";

type Props = {
  task: TeamTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const checklistKey = (taskId: string) =>
  ["team-task-checklist", taskId] as const;

export function TeamTaskDetailSheet({ task, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setEditingTitle(false);
    }
  }, [task?.id, task?.title, task?.description, open]);

  const { data: checklist, isLoading } = useQuery({
    queryKey: task ? checklistKey(task.id) : ["team-task-checklist", "none"],
    queryFn: () => fetchTeamTaskChecklist(task!.id),
    enabled: !!task && open,
  });

  function invalidateChecklist() {
    if (!task) return;
    qc.invalidateQueries({ queryKey: checklistKey(task.id) });
    qc.invalidateQueries({ queryKey: ["team-checklist-progress"] });
  }

  function invalidateTasks() {
    qc.invalidateQueries({ queryKey: ["team-tasks"] });
  }

  const updateDetails = useMutation({
    mutationFn: (updates: { title?: string; description?: string }) =>
      updateTeamTaskDetails(task!.id, updates),
    onSuccess: () => {
      invalidateTasks();
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao salvar"),
  });

  const addSection = useMutation({
    mutationFn: createTeamChecklistSection,
    onSuccess: invalidateChecklist,
    onError: (e: Error) => toast.error(e.message || "Erro ao criar seção"),
  });

  const renameSection = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateTeamChecklistSection(id, { title }),
    onSuccess: invalidateChecklist,
    onError: (e: Error) => toast.error(e.message || "Erro ao renomear"),
  });

  const removeSection = useMutation({
    mutationFn: deleteTeamChecklistSection,
    onSuccess: invalidateChecklist,
    onError: (e: Error) => toast.error(e.message || "Erro ao excluir seção"),
  });

  const addItem = useMutation({
    mutationFn: createTeamChecklistItem,
    onSuccess: invalidateChecklist,
    onError: (e: Error) => toast.error(e.message || "Erro ao criar tarefa"),
  });

  const bulkAddItems = useMutation({
    mutationFn: createTeamChecklistItemsBulk,
    onSuccess: (created) => {
      invalidateChecklist();
      toast.success(
        created.length === 1
          ? "1 tarefa adicionada"
          : `${created.length} tarefas adicionadas`
      );
    },
    onError: (e: Error) =>
      toast.error(e.message || "Erro ao adicionar tarefas em lote"),
  });

  const toggleItem = useMutation({
    mutationFn: ({
      id,
      isCompleted,
    }: {
      id: string;
      isCompleted: boolean;
    }) => toggleTeamChecklistItem(id, isCompleted),
    onMutate: async ({ id, isCompleted }) => {
      if (!task) return;
      await qc.cancelQueries({ queryKey: checklistKey(task.id) });
      await qc.cancelQueries({ queryKey: ["team-checklist-progress"] });
      const previous = qc.getQueryData(checklistKey(task.id));
      const previousProgress = qc.getQueryData<
        Record<string, { completed: number; total: number }>
      >(["team-checklist-progress"]);

      qc.setQueryData(
        checklistKey(task.id),
        (
          old:
            | Awaited<ReturnType<typeof fetchTeamTaskChecklist>>
            | undefined
        ) => {
          if (!old) return old;
          const items = old.items.map((i) =>
            i.id === id ? { ...i, is_completed: isCompleted } : i
          );
          return { ...old, items };
        }
      );

      const checklist = qc.getQueryData(
        checklistKey(task.id)
      ) as Awaited<ReturnType<typeof fetchTeamTaskChecklist>> | undefined;
      if (checklist) {
        const completed = checklist.items.filter((i) => i.is_completed).length;
        const total = checklist.items.length;
        qc.setQueryData(
          ["team-checklist-progress"],
          (
            old: Record<string, { completed: number; total: number }> | undefined
          ) => ({
            ...(old ?? {}),
            [task.id]: { completed, total },
          })
        );
      }

      return { previous, previousProgress };
    },
    onError: (e: Error, _v, ctx) => {
      if (task && ctx?.previous) {
        qc.setQueryData(checklistKey(task.id), ctx.previous);
      }
      if (ctx?.previousProgress) {
        qc.setQueryData(["team-checklist-progress"], ctx.previousProgress);
      }
      toast.error(e.message || "Erro ao atualizar item");
    },
    onSettled: invalidateChecklist,
  });

  const renameItem = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) =>
      updateTeamChecklistItemLabel(id, label),
    onSuccess: invalidateChecklist,
    onError: (e: Error) => toast.error(e.message || "Erro ao renomear item"),
  });

  const removeItem = useMutation({
    mutationFn: deleteTeamChecklistItem,
    onSuccess: invalidateChecklist,
    onError: (e: Error) => toast.error(e.message || "Erro ao excluir item"),
  });

  if (!task) return null;

  function saveTitle() {
    const next = title.trim() || "Sem título";
    setTitle(next);
    setEditingTitle(false);
    if (next !== task!.title) {
      updateDetails.mutate({ title: next });
    }
  }

  function saveDescription() {
    if (description !== (task!.description ?? "")) {
      updateDetails.mutate({ description });
    }
  }

  const pending =
    addSection.isPending ||
    addItem.isPending ||
    bulkAddItems.isPending ||
    removeSection.isPending ||
    removeItem.isPending;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        className="flex h-[min(92vh,780px)] w-[min(96vw,720px)] max-w-none flex-col gap-0 overflow-hidden border-slate-200 p-0 sm:rounded-xl"
      >
        <DialogTitle className="sr-only">{task.title}</DialogTitle>

        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <span className="rounded-md bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
            {TEAM_TASK_STATUS_LABELS[task.status]}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {editingTitle ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveTitle();
                }
                if (e.key === "Escape") {
                  setTitle(task.title);
                  setEditingTitle(false);
                }
              }}
              className="mb-2 border-teal-300 font-semibold text-xl tracking-tight"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="mb-2 w-full rounded-md px-1 py-0.5 text-left text-xl font-semibold tracking-tight text-slate-900 hover:bg-slate-50"
              title="Clique para editar o título"
            >
              {title}
            </button>
          )}

          <section className="mb-8">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <List className="h-4 w-4 text-slate-500" />
              Descrição
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              placeholder="Adicione uma descrição mais detalhada..."
              className="min-h-[88px] resize-y border-slate-200 bg-slate-50/80 text-sm shadow-none focus-visible:bg-white"
            />
          </section>

          <section>
            <div className="mb-4 text-sm font-semibold text-slate-800">
              Checklist
            </div>
            {isLoading ? (
              <p className="text-sm text-slate-500">Carregando checklist…</p>
            ) : (
              <ChecklistEditor
                key={task.id}
                sections={checklist?.sections ?? []}
                items={checklist?.items ?? []}
                pending={pending}
                onImportClick={() => setImportOpen(true)}
                handlers={{
                  onAddTopic: (sectionTitle) =>
                    addSection.mutate({
                      teamTaskId: task.id,
                      title: sectionTitle,
                      parentId: null,
                    }),
                  onAddSubtopic: (topicId, sectionTitle) =>
                    addSection.mutate({
                      teamTaskId: task.id,
                      title: sectionTitle,
                      parentId: topicId,
                    }),
                  onRenameSection: (sectionId, sectionTitle) =>
                    renameSection.mutate({
                      id: sectionId,
                      title: sectionTitle,
                    }),
                  onDeleteSection: (sectionId) =>
                    removeSection.mutate(sectionId),
                  onAddItem: (sectionId, label) =>
                    addItem.mutate({
                      teamTaskId: task.id,
                      sectionId,
                      label,
                    }),
                  onBulkAddItems: (sectionId, labels) =>
                    bulkAddItems.mutate({
                      teamTaskId: task.id,
                      sectionId,
                      labels,
                    }),
                  onToggleItem: (itemId, isCompleted) =>
                    toggleItem.mutate({ id: itemId, isCompleted }),
                  onRenameItem: (itemId, label) =>
                    renameItem.mutate({ id: itemId, label }),
                  onDeleteItem: (itemId) => removeItem.mutate(itemId),
                }}
              />
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>

    <ImportTeamChecklistDialog
      open={importOpen}
      onOpenChange={setImportOpen}
      targetTaskId={task.id}
      onImported={invalidateChecklist}
    />
    </>
  );
}

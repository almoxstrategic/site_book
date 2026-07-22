"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
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
import {
  fetchTeamTaskChecklist,
  fetchTeamTasks,
  importTeamChecklist,
} from "@/lib/api";
import { TEAM_TASK_STATUS_LABELS, type TeamTask } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetTaskId: string;
  onImported: () => void;
};

export function ImportTeamChecklistDialog({
  open,
  onOpenChange,
  targetTaskId,
  onImported,
}: Props) {
  const [sourceTaskId, setSourceTaskId] = useState<string>("");
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ["team-tasks"],
    queryFn: fetchTeamTasks,
    enabled: open,
  });

  const sourceOptions = useMemo(
    () =>
      [...tasks]
        .filter((t) => t.id !== targetTaskId)
        .sort((a, b) => a.title.localeCompare(b.title, "pt-BR")),
    [tasks, targetTaskId]
  );

  const selectedTask: TeamTask | undefined = sourceOptions.find(
    (t) => t.id === sourceTaskId
  );

  const {
    data: sourceChecklist,
    isFetching: loadingStructure,
  } = useQuery({
    queryKey: ["team-task-checklist-import-preview", sourceTaskId],
    queryFn: () => fetchTeamTaskChecklist(sourceTaskId),
    enabled: open && !!sourceTaskId,
  });

  const topics = useMemo(() => {
    if (!sourceChecklist) return [];
    const list = sourceChecklist.sections
      .filter((s) => !s.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order);
    return list.map((topic) => {
      const subtopics = sourceChecklist.sections
        .filter((s) => s.parent_id === topic.id)
        .sort((a, b) => a.sort_order - b.sort_order);
      const topicItemCount = sourceChecklist.items.filter(
        (i) => i.section_id === topic.id
      ).length;
      const subItemCount = subtopics.reduce(
        (sum, sub) =>
          sum +
          sourceChecklist.items.filter((i) => i.section_id === sub.id).length,
        0
      );
      return {
        topic,
        subtopics,
        taskCount: topicItemCount + subItemCount,
      };
    });
  }, [sourceChecklist]);

  const importMutation = useMutation({
    mutationFn: (topicId?: string) =>
      importTeamChecklist({
        targetTaskId,
        sourceTaskId,
        topicId,
      }),
    onSuccess: () => {
      toast.success("Checklist importado");
      onImported();
      setSourceTaskId("");
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast.error(e.message || "Erro ao importar checklist"),
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSourceTaskId("");
      setTaskPickerOpen(false);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(90vh,640px)] w-[min(96vw,520px)] max-w-none overflow-hidden p-0 sm:rounded-xl">
        <DialogHeader className="border-b border-slate-100 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Copy className="h-4 w-4 text-teal-700" />
            Copiar de outra tarefa
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">
              Tarefa de origem
            </p>
            <Popover open={taskPickerOpen} onOpenChange={setTaskPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={taskPickerOpen}
                  className={cn(
                    "h-9 w-full justify-between font-normal",
                    !selectedTask && "text-slate-500"
                  )}
                >
                  <span className="truncate">
                    {selectedTask
                      ? selectedTask.title
                      : "Selecionar tarefa…"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder="Buscar tarefa…" />
                  <CommandList>
                    <CommandEmpty>Nenhuma tarefa encontrada.</CommandEmpty>
                    <CommandGroup>
                      {sourceOptions.map((task) => (
                        <CommandItem
                          key={task.id}
                          value={task.title}
                          onSelect={() => {
                            setSourceTaskId(task.id);
                            setTaskPickerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "h-4 w-4",
                              sourceTaskId === task.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm">{task.title}</p>
                            <p className="text-xs text-slate-500">
                              {TEAM_TASK_STATUS_LABELS[task.status]}
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {sourceTaskId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-700">
                  Estrutura do checklist
                </p>
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  disabled={
                    importMutation.isPending ||
                    loadingStructure ||
                    topics.length === 0
                  }
                  onClick={() => importMutation.mutate(undefined)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Importar checklist completo
                </Button>
              </div>

              {loadingStructure ? (
                <p className="text-sm text-slate-500">Carregando estrutura…</p>
              ) : topics.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                  Esta tarefa não possui tópicos para importar.
                </p>
              ) : (
                <ul className="space-y-2">
                  {topics.map(({ topic, subtopics, taskCount }) => (
                    <li
                      key={topic.id}
                      className="rounded-lg border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {topic.title || "Sem título"}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {subtopics.length} subtópico(s) · {taskCount}{" "}
                            tarefa(s)
                          </p>
                          {subtopics.length > 0 && (
                            <ul className="mt-2 space-y-1 border-l border-slate-200 pl-3">
                              {subtopics.map((sub) => (
                                <li
                                  key={sub.id}
                                  className="text-xs text-slate-600"
                                >
                                  {sub.title || "Subtópico sem título"}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 shrink-0 gap-1.5"
                          disabled={importMutation.isPending}
                          onClick={() => importMutation.mutate(topic.id)}
                        >
                          Importar
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-slate-500">
                As tarefas importadas entram desmarcadas (0% concluído).
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 px-5 py-3">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={importMutation.isPending}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

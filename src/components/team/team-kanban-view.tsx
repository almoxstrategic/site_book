"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createTeamTask,
  deleteTeamTask,
  fetchTeamChecklistProgress,
  fetchTeamTasks,
  moveTeamTask,
} from "@/lib/api";
import {
  TEAM_TASK_STATUSES,
  TEAM_TASK_STATUS_LABELS,
  type TeamTask,
  type TeamTaskStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { TeamTaskDetailSheet } from "@/components/team/team-task-detail-sheet";

const queryKey = ["team-tasks"] as const;
const progressQueryKey = ["team-checklist-progress"] as const;

function TeamTaskCard({
  task,
  completed,
  total,
  onDelete,
  onClick,
  dragOverlay = false,
}: {
  task: TeamTask;
  completed: number;
  total: number;
  onDelete?: () => void;
  onClick?: () => void;
  dragOverlay?: boolean;
}) {
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", status: task.status },
    disabled: dragOverlay,
  });

  const content = (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1 text-left">
        <p className="text-sm font-semibold tracking-tight text-slate-900">
          {task.title}
        </p>
        {task.description.trim() && (
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-slate-500">
            {task.description}
          </p>
        )}
        {total > 0 && (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <CheckSquare className="h-3.5 w-3.5 text-teal-700" />
              <span>
                {completed}/{total} concluídos
              </span>
              <span className="text-slate-300">·</span>
              <span>{pct}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-teal-600"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        )}
      </div>
      {onDelete && (
        <button
          type="button"
          data-no-dnd
          className="rounded p-1 text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Excluir tarefa"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  if (dragOverlay) {
    return (
      <div className="box-border w-full cursor-grabbing rounded-lg border border-teal-300 bg-white p-3 shadow-lg">
        {content}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "group box-border cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm touch-none",
        !isDragging && "transition hover:border-teal-300 hover:shadow-md",
        isDragging && "opacity-0"
      )}
      {...attributes}
      {...listeners}
      onPointerDown={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
        listeners?.onPointerDown?.(e);
      }}
      onClick={(e) => {
        if (isDragging) return;
        if ((e.target as HTMLElement).closest("[data-no-dnd]")) return;
        const start = pointerStart.current;
        if (start) {
          const dx = Math.abs(e.clientX - start.x);
          const dy = Math.abs(e.clientY - start.y);
          if (dx > 8 || dy > 8) return;
        }
        onClick?.();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {content}
    </div>
  );
}

function TeamColumn({
  status,
  tasks,
  progress,
  isDropTarget,
  onAdd,
  onDeleteTask,
  onOpenTask,
}: {
  status: TeamTaskStatus;
  tasks: TeamTask[];
  progress: Record<string, { completed: number; total: number }>;
  isDropTarget: boolean;
  onAdd: () => void;
  onDeleteTask: (id: string) => void;
  onOpenTask: (task: TeamTask) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: status,
    data: { type: "column", status },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full min-h-[24rem] min-w-0 w-full flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/90 shadow-sm transition-colors",
        isDropTarget &&
          "border-2 border-green-500 bg-green-50/30 ring-2 ring-green-200/50"
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-200/70 px-3 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold uppercase tracking-wide text-slate-800">
            {TEAM_TASK_STATUS_LABELS[status]}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-slate-500 hover:text-teal-800"
          onClick={onAdd}
          aria-label="Nova tarefa nesta coluna"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {tasks.map((task) => {
              const p = progress[task.id] ?? { completed: 0, total: 0 };
              return (
                <TeamTaskCard
                  key={task.id}
                  task={task}
                  completed={p.completed}
                  total={p.total}
                  onClick={() => onOpenTask(task)}
                  onDelete={() => {
                    if (confirm(`Excluir a tarefa "${task.title}"?`)) {
                      onDeleteTask(task.id);
                    }
                  }}
                />
              );
            })}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

export function TeamKanbanView() {
  const qc = useQueryClient();
  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey,
    queryFn: fetchTeamTasks,
  });
  const { data: progress = {} } = useQuery({
    queryKey: progressQueryKey,
    queryFn: fetchTeamChecklistProgress,
  });

  const [activeTask, setActiveTask] = useState<TeamTask | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<TeamTaskStatus | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<TeamTaskStatus>("todo");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const selectedTask =
    tasks.find((t) => t.id === selectedTaskId) ?? null;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  const tasksByStatus = useMemo(() => {
    const map = new Map<TeamTaskStatus, TeamTask[]>();
    for (const status of TEAM_TASK_STATUSES) map.set(status, []);
    for (const task of [...tasks].sort((a, b) => a.position - b.position)) {
      map.get(task.status)?.push(task);
    }
    return map;
  }, [tasks]);

  const createMutation = useMutation({
    mutationFn: createTeamTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Tarefa criada");
      setTitle("");
      setDescription("");
      setModalOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao criar tarefa"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTeamTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Tarefa excluída");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao excluir tarefa"),
  });

  const moveMutation = useMutation({
    mutationFn: moveTeamTask,
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<TeamTask[]>(queryKey);

      qc.setQueryData<TeamTask[]>(queryKey, (old) => {
        if (!old) return old;
        const moving = old.find((t) => t.id === vars.taskId);
        if (!moving) return old;

        const without = old.filter((t) => t.id !== vars.taskId);
        const destination = without
          .filter((t) => t.status === vars.toStatus)
          .sort((a, b) => a.position - b.position);
        destination.splice(vars.toPosition, 0, {
          ...moving,
          status: vars.toStatus,
        });

        const reindexedDestination = destination.map((t, i) => ({
          ...t,
          status: vars.toStatus,
          position: i,
        }));

        const reindexedSource =
          vars.fromStatus === vars.toStatus
            ? []
            : without
                .filter((t) => t.status === vars.fromStatus)
                .sort((a, b) => a.position - b.position)
                .map((t, i) => ({ ...t, position: i }));

        const untouched = without.filter(
          (t) =>
            t.status !== vars.toStatus &&
            (vars.fromStatus === vars.toStatus || t.status !== vars.fromStatus)
        );

        return [...untouched, ...reindexedSource, ...reindexedDestination];
      });

      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKey, ctx.previous);
      toast.error(e.message || "Erro ao mover tarefa");
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  function findStatus(id: string): TeamTaskStatus | undefined {
    if (TEAM_TASK_STATUSES.includes(id as TeamTaskStatus)) {
      return id as TeamTaskStatus;
    }
    return tasks.find((t) => t.id === id)?.status;
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const overId = event.over?.id;
    if (!overId) {
      setOverStatus(null);
      return;
    }
    setOverStatus(findStatus(String(overId)) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    setOverStatus(null);
    if (!over) return;

    const taskId = String(active.id);
    const fromStatus = findStatus(taskId);
    const toStatus = findStatus(String(over.id));
    if (!fromStatus || !toStatus) return;

    const targetList = (tasksByStatus.get(toStatus) ?? []).filter(
      (t) => t.id !== taskId
    );
    let toPosition = targetList.length;

    if (!TEAM_TASK_STATUSES.includes(String(over.id) as TeamTaskStatus)) {
      const overIndex = targetList.findIndex((t) => t.id === over.id);
      if (overIndex >= 0) toPosition = overIndex;
    }

    const currentIndex = (tasksByStatus.get(fromStatus) ?? []).findIndex(
      (t) => t.id === taskId
    );
    if (
      fromStatus === toStatus &&
      (currentIndex === toPosition || currentIndex < 0)
    ) {
      return;
    }

    moveMutation.mutate({
      taskId,
      fromStatus,
      toStatus,
      toPosition,
    });
  }

  function openCreate(status: TeamTaskStatus = "todo") {
    setModalStatus(status);
    setTitle("");
    setDescription("");
    setModalOpen(true);
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Carregando board da equipe…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center text-rose-600">
        Erro ao carregar tarefas da equipe.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Arraste tarefas entre as colunas para atualizar o status.
        </p>
        <Button size="sm" className="w-full sm:w-auto" onClick={() => openCreate()}>
          <Plus /> Nova Tarefa
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveTask(null);
          setOverStatus(null);
        }}
      >
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="grid h-full w-full min-w-0 grid-cols-1 gap-4 overflow-y-auto pb-4 md:grid-cols-3 md:overflow-hidden">
            {TEAM_TASK_STATUSES.map((status) => {
              const columnTasks = tasksByStatus.get(status) ?? [];
              return (
                <TeamColumn
                  key={status}
                  status={status}
                  tasks={columnTasks}
                  progress={progress}
                  isDropTarget={
                    !!activeTask &&
                    overStatus === status &&
                    activeTask.status !== status
                  }
                  onAdd={() => openCreate(status)}
                  onDeleteTask={(id) => deleteMutation.mutate(id)}
                  onOpenTask={(task) => setSelectedTaskId(task.id)}
                />
              );
            })}
          </div>
        </div>

        <DragOverlay dropAnimation={null} style={{ cursor: "grabbing" }}>
          {activeTask ? (
            <TeamTaskCard
              task={activeTask}
              completed={progress[activeTask.id]?.completed ?? 0}
              total={progress[activeTask.id]?.total ?? 0}
              dragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <TeamTaskDetailSheet
        task={selectedTask}
        open={!!selectedTaskId}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
      />

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) setModalOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="team-task-title">Título</Label>
              <Input
                id="team-task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Revisar laudo do site SP..."
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="team-task-description">Descrição</Label>
              <Textarea
                id="team-task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes opcionais da tarefa..."
                className="min-h-[96px]"
              />
            </div>
            <p className="text-xs text-slate-500">
              Coluna: {TEAM_TASK_STATUS_LABELS[modalStatus]}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!title.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  title: title.trim(),
                  description,
                  status: modalStatus,
                })
              }
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

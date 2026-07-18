"use client";

import { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckSquare, MessageSquare, Trash2 } from "lucide-react";
import type { Card } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  card: Card;
  completed: number;
  total: number;
  commentCount?: number;
  onClick?: () => void;
  onDelete?: () => void;
  dragging?: boolean;
};

export function KanbanCard({
  card,
  completed,
  total,
  commentCount = 0,
  onClick,
  onDelete,
  dragging,
}: Props) {
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled: dragging });

  const style = dragging
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const title = card.title || card.id;

  const dndProps = dragging ? {} : { ...attributes, ...listeners };

  return (
    <div
      ref={dragging ? undefined : setNodeRef}
      style={style}
      className={cn(
        "group relative cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-teal-300 hover:shadow-md active:cursor-grabbing touch-none",
        (isDragging || dragging) && "opacity-80 shadow-lg ring-2 ring-teal-300",
        dragging && "cursor-grabbing"
      )}
      {...dndProps}
      onPointerDown={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
        const handler = (dndProps as { onPointerDown?: (ev: React.PointerEvent) => void })
          .onPointerDown;
        handler?.(e);
      }}
      onClick={(e) => {
        if (dragging || isDragging) return;
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
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 text-left">
          <p className="font-mono text-sm font-semibold tracking-tight text-slate-900">
            {title}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <CheckSquare className="h-3.5 w-3.5 text-teal-700" />
            <span>
              {completed}/{total} concluídos
            </span>
            <span className="text-slate-300">·</span>
            <span>{pct}%</span>
            {commentCount > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span
                  className="inline-flex items-center gap-1 text-slate-600"
                  title={`${commentCount} comentário(s)`}
                >
                  <MessageSquare className="h-3.5 w-3.5 text-sky-700" />
                  {commentCount}
                </span>
              </>
            )}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-teal-600 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {onDelete && !dragging && (
          <button
            type="button"
            data-no-dnd
            className="rounded p-1 text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

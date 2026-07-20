"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Column } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  column: Column;
  count: number;
  children: React.ReactNode;
  isDropTarget?: boolean;
  onAddCard: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  /** Visual-only preview inside DragOverlay */
  dragOverlay?: boolean;
};

export function KanbanColumn({
  column,
  count,
  children,
  isDropTarget = false,
  onAddCard,
  onRename,
  onDelete,
  dragOverlay = false,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: dragOverlay ? `overlay-${column.id}` : column.id,
    data: { type: "column" },
    disabled: dragOverlay,
  });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const highlighted = isDropTarget;

  const style = dragOverlay
    ? undefined
    : {
        transform: CSS.Translate.toString(transform),
        transition,
      };

  return (
    <div
      ref={dragOverlay ? undefined : setNodeRef}
      style={style}
      className={cn(
        "flex h-full min-h-0 w-[320px] min-w-[320px] shrink-0 flex-col self-stretch overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/90 shadow-sm transition-colors md:w-80 md:min-w-80",
        highlighted &&
          "border-2 border-green-500 bg-green-50/30 ring-2 ring-green-200/50",
        isDragging && !dragOverlay && "opacity-40",
        dragOverlay && "cursor-grabbing shadow-xl ring-2 ring-teal-200"
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-200/70 px-3 py-3">
        <div
          className={cn(
            "flex min-w-0 flex-1 items-start gap-1",
            !editing && !dragOverlay && "cursor-grab active:cursor-grabbing"
          )}
          {...(editing || dragOverlay ? {} : { ...attributes, ...listeners })}
        >
          {!editing && (
            <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          )}
          <div className="min-w-0 flex-1">
            {editing ? (
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  setEditing(false);
                  if (name.trim() && name.trim() !== column.name) {
                    onRename(name.trim());
                  } else {
                    setName(column.name);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") {
                    setName(column.name);
                    setEditing(false);
                  }
                }}
                className="h-8 text-sm font-semibold"
              />
            ) : (
              <button
                type="button"
                className="text-left text-sm font-semibold tracking-wide text-slate-800"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditing(true);
                }}
              >
                {column.name}
              </button>
            )}
            <p className="mt-0.5 text-xs text-slate-500">{count} sites</p>
          </div>
        </div>
        {!dragOverlay && (
          <div className="relative flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onAddCard}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-20 w-40 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditing(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Renomear
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3">
        {children}
      </div>
    </div>
  );
}

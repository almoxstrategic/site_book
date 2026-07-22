"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckSquare, ClipboardPaste, Copy, ListPlus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TeamChecklistItem, TeamChecklistSection } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ChecklistEditorHandlers = {
  onAddTopic: (title: string) => void;
  onAddSubtopic: (topicId: string, title: string) => void;
  onRenameSection: (sectionId: string, title: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onAddItem: (sectionId: string, label: string) => void;
  onBulkAddItems: (sectionId: string, labels: string[]) => void;
  onToggleItem: (itemId: string, isCompleted: boolean) => void;
  onRenameItem: (itemId: string, label: string) => void;
  onDeleteItem: (itemId: string) => void;
};

type Props = {
  sections: TeamChecklistSection[];
  items: TeamChecklistItem[];
  handlers: ChecklistEditorHandlers;
  pending?: boolean;
  onImportClick?: () => void;
};

function BulkPasteButton({
  disabled,
  onConfirm,
}: {
  disabled?: boolean;
  onConfirm: (labels: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pastedText, setPastedText] = useState("");

  function handleConfirm() {
    const labels = pastedText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (labels.length === 0) return;
    onConfirm(labels);
    setPastedText("");
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setPastedText("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="h-8 gap-1.5 bg-slate-100 text-xs font-medium text-slate-600 shadow-none"
          type="button"
          disabled={disabled}
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
          Colar do Excel
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-800">Adicionar em lote</p>
          <Textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Cole aqui as linhas copiadas do Excel (Ctrl+V)..."
            className="min-h-[120px] resize-y text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              type="button"
              disabled={!pastedText.trim()}
              onClick={handleConfirm}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AddItemActions({
  disabled,
  onAddOne,
  onBulkAdd,
  className,
}: {
  disabled?: boolean;
  onAddOne: () => void;
  onBulkAdd: (labels: string[]) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        variant="secondary"
        size="sm"
        className="h-8 bg-slate-100 text-xs font-medium text-slate-600 shadow-none"
        type="button"
        disabled={disabled}
        onClick={onAddOne}
      >
        Adicionar tarefa
      </Button>
      <BulkPasteButton disabled={disabled} onConfirm={onBulkAdd} />
    </div>
  );
}

type DraftMode =
  | { kind: "topic" }
  | { kind: "subtopic"; topicId: string }
  | { kind: "item"; sectionId: string }
  | { kind: "edit-section"; sectionId: string }
  | { kind: "edit-item"; itemId: string }
  | null;

export function ChecklistEditor({
  sections,
  items,
  handlers,
  pending = false,
  onImportClick,
}: Props) {
  const [draftMode, setDraftMode] = useState<DraftMode>(null);
  const [draftText, setDraftText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (draftMode) inputRef.current?.focus();
  }, [draftMode]);

  const topics = useMemo(
    () =>
      sections
        .filter((s) => !s.parent_id)
        .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id)),
    [sections]
  );

  const subtopicsByTopic = useMemo(() => {
    const map = new Map<string, TeamChecklistSection[]>();
    for (const section of sections) {
      if (!section.parent_id) continue;
      const list = map.get(section.parent_id) ?? [];
      list.push(section);
      map.set(section.parent_id, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
    }
    return map;
  }, [sections]);

  const itemsBySection = useMemo(() => {
    const map = new Map<string, TeamChecklistItem[]>();
    for (const item of items) {
      const list = map.get(item.section_id) ?? [];
      list.push(item);
      map.set(item.section_id, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
    }
    return map;
  }, [items]);

  function cancelDraft() {
    setDraftMode(null);
    setDraftText("");
  }

  function commitDraft() {
    if (!draftMode) return;
    const text = draftText.trim();

    if (draftMode.kind === "topic") {
      handlers.onAddTopic(text || "Novo tópico");
    } else if (draftMode.kind === "subtopic") {
      handlers.onAddSubtopic(draftMode.topicId, text || "Novo subtópico");
    } else if (draftMode.kind === "item") {
      if (!text) {
        cancelDraft();
        return;
      }
      handlers.onAddItem(draftMode.sectionId, text);
    } else if (draftMode.kind === "edit-section") {
      if (text) handlers.onRenameSection(draftMode.sectionId, text);
    } else if (draftMode.kind === "edit-item") {
      handlers.onRenameItem(draftMode.itemId, text);
    }

    cancelDraft();
  }

  function sectionProgress(sectionIds: string[]) {
    const sectionItems = sectionIds.flatMap(
      (id) => itemsBySection.get(id) ?? []
    );
    const done = sectionItems.filter((i) => i.is_completed).length;
    const total = sectionItems.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { done, total, pct };
  }

  function renderItems(sectionId: string) {
    const sectionItems = itemsBySection.get(sectionId) ?? [];
    return (
      <ul className="space-y-1">
        {sectionItems.map((item) => (
          <li
            key={item.id}
            className="group flex items-start gap-3 rounded-md px-1 py-1.5 hover:bg-slate-50"
          >
            <Checkbox
              id={`team-check-${item.id}`}
              checked={item.is_completed}
              onCheckedChange={(checked) =>
                handlers.onToggleItem(item.id, checked === true)
              }
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="mt-0.5"
            />
            {draftMode?.kind === "edit-item" &&
            draftMode.itemId === item.id ? (
              <Input
                ref={inputRef}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onBlur={commitDraft}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitDraft();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelDraft();
                  }
                }}
                className="h-8 flex-1 text-sm"
                placeholder="Nome da tarefa"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraftMode({ kind: "edit-item", itemId: item.id });
                  setDraftText(item.label);
                }}
                className={cn(
                  "min-w-0 flex-1 rounded-sm px-1 text-left text-sm leading-snug text-slate-700 hover:bg-white hover:ring-1 hover:ring-slate-200",
                  item.is_completed && "text-slate-400 line-through"
                )}
                title="Clique para editar"
              >
                {item.label || "Tarefa sem nome"}
              </button>
            )}
            <button
              type="button"
              aria-label="Excluir tarefa"
              className="mt-0.5 shrink-0 rounded p-1 text-gray-400 opacity-0 transition hover:bg-rose-50 hover:text-red-500 group-hover:opacity-100 focus-visible:opacity-100"
              onClick={() => {
                if (!confirm("Deseja realmente excluir esta tarefa?")) return;
                handlers.onDeleteItem(item.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}

        {draftMode?.kind === "item" && draftMode.sectionId === sectionId && (
          <li className="flex items-start gap-3 rounded-md px-1 py-1.5">
            <span className="mt-0.5 h-4 w-4" />
            <Input
              ref={inputRef}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitDraft();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelDraft();
                }
              }}
              className="h-8 text-sm"
              placeholder="Digite o nome da tarefa…"
            />
          </li>
        )}
      </ul>
    );
  }

  function renderSectionTitle(
    section: TeamChecklistSection,
    className?: string
  ) {
    if (
      draftMode?.kind === "edit-section" &&
      draftMode.sectionId === section.id
    ) {
      return (
        <Input
          ref={inputRef}
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancelDraft();
            }
          }}
          className="h-8 text-sm font-semibold"
        />
      );
    }

    return (
      <button
        type="button"
        onClick={() => {
          setDraftMode({ kind: "edit-section", sectionId: section.id });
          setDraftText(section.title);
        }}
        className={cn(
          "rounded-sm px-1 text-left hover:bg-slate-50 hover:ring-1 hover:ring-slate-200",
          className
        )}
        title="Clique para editar"
      >
        {section.title || "Sem título"}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {topics.length === 0 && draftMode?.kind !== "topic" && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
          <p className="text-sm text-slate-500">
            Nenhum checklist nesta tarefa.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Button
              size="sm"
              disabled={pending}
              onClick={() => {
                setDraftMode({ kind: "topic" });
                setDraftText("");
              }}
            >
              <ListPlus className="h-4 w-4" />
              Adicionar tópico
            </Button>
            {onImportClick && (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={onImportClick}
              >
                <Copy className="h-4 w-4" />
                Copiar de outra tarefa
              </Button>
            )}
          </div>
        </div>
      )}

      {topics.map((topic) => {
        const subtopics = subtopicsByTopic.get(topic.id) ?? [];
        const progressIds = [
          topic.id,
          ...subtopics.map((s) => s.id),
        ];
        const { pct } = sectionProgress(progressIds);

        return (
          <section key={topic.id} className="mb-2">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800">
                <CheckSquare className="h-4 w-4 shrink-0 text-slate-500" />
                {renderSectionTitle(topic, "text-sm font-semibold text-slate-800")}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 bg-slate-100 text-xs text-slate-600 shadow-none"
                type="button"
                onClick={() => {
                  if (
                    !confirm(
                      `Excluir o tópico "${topic.title}" e todo o conteúdo?`
                    )
                  ) {
                    return;
                  }
                  handlers.onDeleteSection(topic.id);
                }}
              >
                Excluir
              </Button>
            </div>

            <div className="mb-3 flex items-center gap-3">
              <span className="w-8 shrink-0 text-xs tabular-nums text-slate-500">
                {pct}%
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    pct === 100 ? "bg-teal-600" : "bg-teal-500"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Tasks directly under topic */}
            <div className="mb-3">{renderItems(topic.id)}</div>
            {draftMode?.kind === "item" &&
            draftMode.sectionId === topic.id ? null : (
              <AddItemActions
                className="mb-4"
                disabled={pending}
                onAddOne={() => {
                  setDraftMode({ kind: "item", sectionId: topic.id });
                  setDraftText("");
                }}
                onBulkAdd={(labels) =>
                  handlers.onBulkAddItems(topic.id, labels)
                }
              />
            )}

            {/* Subtopics */}
            <div className="ml-1 space-y-4 border-l border-slate-200 pl-4">
              {subtopics.map((sub) => {
                const subProgress = sectionProgress([sub.id]);
                return (
                  <div key={sub.id}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700">
                        {renderSectionTitle(
                          sub,
                          "text-sm font-medium text-slate-700"
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs tabular-nums text-slate-400">
                          {subProgress.pct}%
                        </span>
                        <button
                          type="button"
                          className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Excluir subtópico"
                          onClick={() => {
                            if (
                              !confirm(
                                `Excluir o subtópico "${sub.title}" e suas tarefas?`
                              )
                            ) {
                              return;
                            }
                            handlers.onDeleteSection(sub.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {renderItems(sub.id)}
                    {!(
                      draftMode?.kind === "item" &&
                      draftMode.sectionId === sub.id
                    ) && (
                      <AddItemActions
                        className="mt-2"
                        disabled={pending}
                        onAddOne={() => {
                          setDraftMode({ kind: "item", sectionId: sub.id });
                          setDraftText("");
                        }}
                        onBulkAdd={(labels) =>
                          handlers.onBulkAddItems(sub.id, labels)
                        }
                      />
                    )}
                  </div>
                );
              })}

              {draftMode?.kind === "subtopic" &&
                draftMode.topicId === topic.id && (
                  <Input
                    ref={inputRef}
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    onBlur={commitDraft}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitDraft();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelDraft();
                      }
                    }}
                    className="h-8 text-sm"
                    placeholder="Nome do subtópico…"
                  />
                )}

              {!(
                draftMode?.kind === "subtopic" &&
                draftMode.topicId === topic.id
              ) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2 text-xs text-teal-800 hover:bg-teal-50"
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setDraftMode({ kind: "subtopic", topicId: topic.id });
                    setDraftText("");
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar subtópico
                </Button>
              )}
            </div>
          </section>
        );
      })}

      {draftMode?.kind === "topic" && (
        <Input
          ref={inputRef}
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancelDraft();
            }
          }}
          className="h-9 text-sm font-semibold"
          placeholder="Nome do tópico…"
        />
      )}

      {draftMode?.kind !== "topic" && topics.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-teal-200 text-teal-800 hover:bg-teal-50"
            type="button"
            disabled={pending}
            onClick={() => {
              setDraftMode({ kind: "topic" });
              setDraftText("");
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar tópico
          </Button>
          {onImportClick && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              type="button"
              disabled={pending}
              onClick={onImportClick}
            >
              <Copy className="h-3.5 w-3.5" />
              Copiar de outra tarefa
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

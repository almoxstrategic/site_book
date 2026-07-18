"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  CheckSquare,
  Eye,
  ImageIcon,
  List,
  ListPlus,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Tag,
  User,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBoardMutations, useComments } from "@/hooks/use-board";
import { checklistItemLabel } from "@/lib/checklist-defaults";
import type { Card, CardChecklistItem, Column } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  card: Card | null;
  columns: Column[];
  checklist: CardChecklistItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatCommentDate(date: string) {
  const d = new Date(date);
  const absolute = format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const relative = formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
  return { absolute, relative };
}

function itemCategoryName(item: CardChecklistItem) {
  return (
    item.checklist_categories?.name ??
    item.checklist_templates?.checklist_categories?.name ??
    "Outros"
  );
}

function itemCategoryId(item: CardChecklistItem) {
  return (
    item.category_id ??
    item.checklist_categories?.id ??
    item.checklist_templates?.category_id ??
    null
  );
}

export function CardDetailSheet({
  card,
  columns,
  checklist,
  open,
  onOpenChange,
}: Props) {
  const {
    setChecklist,
    editCard,
    renameChecklistItem,
    createChecklistItem,
    removeChecklistItem,
    applyDefaultChecklists,
  } = useBoardMutations();
  const comments = useComments(card?.id ?? null);

  const [title, setTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [description, setDescription] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [showDetails, setShowDetails] = useState(true);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [addingCategoryId, setAddingCategoryId] = useState<string | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const itemInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (card) {
      setTitle(card.title || card.id);
      setDescription(card.description ?? "");
      setEditingTitle(false);
      setCommentDraft("");
      setEditingCommentId(null);
      setEditingItemId(null);
      setAddingCategoryId(null);
    }
  }, [card?.id, card?.title, card?.description, open]);

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (editingItemId || addingCategoryId) {
      itemInputRef.current?.focus();
    }
  }, [editingItemId, addingCategoryId]);

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { categoryId: string | null; items: CardChecklistItem[] }
    >();
    const sorted = [...checklist].sort((a, b) => {
      const ao =
        a.sort_order ?? a.checklist_templates?.sort_order ?? 0;
      const bo =
        b.sort_order ?? b.checklist_templates?.sort_order ?? 0;
      return ao - bo;
    });
    for (const item of sorted) {
      const cat = itemCategoryName(item);
      const current = map.get(cat) ?? {
        categoryId: itemCategoryId(item),
        items: [],
      };
      if (!current.categoryId) current.categoryId = itemCategoryId(item);
      current.items.push(item);
      map.set(cat, current);
    }
    return map;
  }, [checklist]);

  function saveTitle() {
    if (!card) return;
    const next = title.trim() || card.id;
    setTitle(next);
    setEditingTitle(false);
    if (next !== (card.title || card.id)) {
      editCard.mutate({ id: card.id, title: next });
    }
  }

  function saveDescription() {
    if (!card) return;
    if (description !== (card.description ?? "")) {
      editCard.mutate({ id: card.id, description });
    }
  }

  function startEditItem(item: CardChecklistItem) {
    setAddingCategoryId(null);
    setEditingItemId(item.id);
    setDraftLabel(checklistItemLabel(item));
  }

  function cancelEditItem() {
    setEditingItemId(null);
    setDraftLabel("");
    setAddingCategoryId(null);
  }

  function saveEditItem() {
    if (!editingItemId) return;
    const label = draftLabel.trim();
    renameChecklistItem.mutate(
      { itemId: editingItemId, label },
      { onSettled: () => cancelEditItem() }
    );
  }

  function startAddItem(categoryId: string) {
    setEditingItemId(null);
    setAddingCategoryId(categoryId);
    setDraftLabel("");
  }

  function saveNewItem() {
    if (!card || !addingCategoryId) return;
    const label = draftLabel.trim();
    if (!label) {
      cancelEditItem();
      return;
    }
    createChecklistItem.mutate(
      { cardId: card.id, categoryId: addingCategoryId, label },
      { onSettled: () => cancelEditItem() }
    );
  }

  if (!card) return null;

  const columnName =
    columns.find((c) => c.id === card.column_id)?.name ?? "Status";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        className="flex h-[min(92vh,880px)] w-[min(96vw,980px)] max-w-none flex-col gap-0 overflow-hidden border-slate-200 p-0 sm:rounded-xl"
      >
        <DialogTitle className="sr-only">{card.title || card.id}</DialogTitle>

        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <Select
            value={card.column_id}
            onValueChange={(columnId) =>
              editCard.mutate({ id: card.id, column_id: columnId })
            }
          >
            <SelectTrigger className="h-8 w-auto min-w-[140px] gap-1 border-slate-200 bg-slate-50 px-3 text-xs font-semibold uppercase tracking-wide text-slate-700 shadow-none [&>svg]:opacity-60">
              <SelectValue>{columnName}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col.id} value={col.id}>
                  {col.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-0.5 text-slate-500">
            <Button variant="ghost" size="icon" className="h-8 w-8" type="button" tabIndex={-1}>
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" type="button" tabIndex={-1}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" type="button" tabIndex={-1}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
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
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_320px]">
          <div className="min-h-0 overflow-y-auto px-6 py-5">
            <div className="mb-3 flex items-start gap-3">
              <span className="mt-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300" />
              {editingTitle ? (
                <textarea
                  ref={titleRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveTitle();
                    }
                    if (e.key === "Escape") {
                      setTitle(card.title || card.id);
                      setEditingTitle(false);
                    }
                  }}
                  rows={1}
                  className="w-full resize-none rounded-md border border-teal-300 bg-white px-2 py-1 font-mono text-xl font-bold tracking-tight text-slate-900 outline-none ring-2 ring-teal-600/20"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingTitle(true)}
                  className="w-full rounded-md px-1 py-0.5 text-left font-mono text-xl font-bold tracking-tight text-slate-900 hover:bg-slate-50"
                  title="Clique para editar o nome"
                >
                  {title}
                </button>
              )}
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              <QuickAction icon={<Plus className="h-3.5 w-3.5" />} label="Adicionar" />
              <QuickAction icon={<Tag className="h-3.5 w-3.5" />} label="Etiquetas" />
              <QuickAction icon={<Calendar className="h-3.5 w-3.5" />} label="Datas" />
              <button
                type="button"
                onClick={() => applyDefaultChecklists.mutate(card.id)}
                disabled={applyDefaultChecklists.isPending}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-teal-200 bg-teal-50 px-3 text-xs font-medium text-teal-800 shadow-sm transition hover:bg-teal-100 disabled:opacity-60"
              >
                <ListPlus className="h-3.5 w-3.5" />
                {applyDefaultChecklists.isPending
                  ? "Adicionando…"
                  : "Adicionar Checklists Padrão"}
              </button>
            </div>

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

            {grouped.size === 0 && (
              <div className="mb-6 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
                <p className="text-sm text-slate-500">
                  Nenhum checklist neste card.
                </p>
                <Button
                  className="mt-3"
                  size="sm"
                  disabled={applyDefaultChecklists.isPending}
                  onClick={() => applyDefaultChecklists.mutate(card.id)}
                >
                  <ListPlus className="h-4 w-4" />
                  Adicionar Checklists Padrão
                </Button>
              </div>
            )}

            {[...grouped.entries()].map(([category, { categoryId, items }]) => {
              const done = items.filter((i) => i.is_completed).length;
              const pct =
                items.length > 0 ? Math.round((done / items.length) * 100) : 0;
              return (
                <section key={category} className="mb-8">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <CheckSquare className="h-4 w-4 text-slate-500" />
                      {category}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 bg-slate-100 text-xs text-slate-600 shadow-none"
                      type="button"
                      onClick={() => {
                        if (
                          !confirm(
                            `Excluir todos os itens de "${category}" neste card?`
                          )
                        ) {
                          return;
                        }
                        for (const item of items) {
                          removeChecklistItem.mutate(item.id);
                        }
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

                  <ul className="space-y-1">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start gap-3 rounded-md px-1 py-1.5 hover:bg-slate-50"
                      >
                        <Checkbox
                          id={`modal-${item.id}`}
                          checked={item.is_completed}
                          onCheckedChange={(checked) =>
                            setChecklist.mutate({
                              itemId: item.id,
                              isCompleted: checked === true,
                            })
                          }
                          className="mt-0.5"
                        />
                        {editingItemId === item.id ? (
                          <Input
                            ref={itemInputRef}
                            value={draftLabel}
                            onChange={(e) => setDraftLabel(e.target.value)}
                            onBlur={saveEditItem}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                saveEditItem();
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                cancelEditItem();
                              }
                            }}
                            className="h-8 text-sm"
                            placeholder="Nome do item"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditItem(item)}
                            className={cn(
                              "flex-1 rounded-sm px-1 text-left text-sm leading-snug text-slate-700 hover:bg-white hover:ring-1 hover:ring-slate-200",
                              item.is_completed && "text-slate-400 line-through"
                            )}
                            title="Clique para editar"
                          >
                            {checklistItemLabel(item)}
                          </button>
                        )}
                      </li>
                    ))}
                    {addingCategoryId &&
                      categoryId === addingCategoryId && (
                        <li className="flex items-start gap-3 rounded-md px-1 py-1.5">
                          <span className="mt-0.5 h-4 w-4" />
                          <Input
                            ref={itemInputRef}
                            value={draftLabel}
                            onChange={(e) => setDraftLabel(e.target.value)}
                            onBlur={saveNewItem}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                saveNewItem();
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                cancelEditItem();
                              }
                            }}
                            className="h-8 text-sm"
                            placeholder="Digite o nome do item…"
                          />
                        </li>
                      )}
                  </ul>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3 h-8 bg-slate-100 text-xs font-medium text-slate-600 shadow-none"
                    type="button"
                    disabled={!categoryId || createChecklistItem.isPending}
                    onClick={() => {
                      if (!categoryId) return;
                      startAddItem(categoryId);
                    }}
                  >
                    Adicionar um item
                  </Button>
                </section>
              );
            })}
          </div>

          <aside className="flex min-h-0 flex-col border-t border-slate-100 bg-slate-50/40 md:border-l md:border-t-0">
            <div className="space-y-2 border-b border-slate-100 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <MessageSquare className="h-4 w-4 text-slate-500" />
                  Comentários e atividade
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetails((v) => !v)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  {showDetails ? "Ocultar Detalhes" : "Mostrar Detalhes"}
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 border-teal-200 bg-white text-teal-800 hover:bg-teal-50"
                disabled={applyDefaultChecklists.isPending}
                onClick={() => applyDefaultChecklists.mutate(card.id)}
              >
                <ListPlus className="h-3.5 w-3.5" />
                Adicionar Checklists Padrão
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div className="mb-5 flex gap-2">
                <UserAvatar />
                <div className="min-w-0 flex-1 space-y-2">
                  <Input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Seu nome"
                    className="h-9 border-slate-200 bg-white text-sm shadow-sm"
                  />
                  <Textarea
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder="Escrever um comentário..."
                    className="min-h-[72px] resize-none border-slate-200 bg-white text-sm shadow-sm"
                  />
                  <Button
                    size="sm"
                    disabled={
                      !authorName.trim() ||
                      !commentDraft.trim() ||
                      comments.add.isPending
                    }
                    onClick={() =>
                      comments.add.mutate(
                        {
                          author: authorName.trim(),
                          content: commentDraft.trim(),
                        },
                        {
                          onSuccess: () => {
                            setCommentDraft("");
                          },
                        }
                      )
                    }
                  >
                    Salvar
                  </Button>
                </div>
              </div>

              <ul className="space-y-4">
                {(comments.data ?? [])
                  .slice()
                  .reverse()
                  .map((c) => {
                    const { absolute, relative } = formatCommentDate(
                      c.created_at
                    );
                    return (
                      <li key={c.id} className="flex gap-2">
                        <UserAvatar />
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="text-sm font-semibold text-slate-800">
                              {c.author || "Anônimo"}
                            </span>
                            <time
                              dateTime={c.created_at}
                              title={relative}
                              className="text-xs text-slate-400"
                            >
                              {absolute}
                            </time>
                          </div>
                          {editingCommentId === c.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editCommentText}
                                onChange={(e) =>
                                  setEditCommentText(e.target.value)
                                }
                                className="min-h-[64px] text-sm"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    comments.edit.mutate(
                                      {
                                        id: c.id,
                                        content: editCommentText.trim(),
                                      },
                                      {
                                        onSuccess: () => {
                                          setEditingCommentId(null);
                                          setEditCommentText("");
                                        },
                                      }
                                    )
                                  }
                                >
                                  Salvar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingCommentId(null)}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                                {c.content}
                              </div>
                              <div className="mt-1.5 flex gap-3 text-xs">
                                <button
                                  type="button"
                                  className="text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
                                  onClick={() => {
                                    setEditingCommentId(c.id);
                                    setEditCommentText(c.content);
                                  }}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="text-slate-500 underline-offset-2 hover:text-rose-600 hover:underline"
                                  onClick={() => {
                                    if (confirm("Excluir comentário?")) {
                                      comments.remove.mutate(c.id);
                                    }
                                  }}
                                >
                                  Excluir
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}

                {showDetails && (
                  <li className="flex gap-2">
                    <UserAvatar />
                    <p className="pt-1 text-sm leading-snug text-slate-600">
                      Alguém adicionou este cartão a{" "}
                      <span className="font-medium">{columnName}</span>{" "}
                      <time
                        dateTime={card.created_at}
                        className="text-slate-400"
                      >
                        {formatCommentDate(card.created_at).absolute}
                      </time>
                    </p>
                  </li>
                )}

                {(comments.data ?? []).length === 0 && !showDetails && (
                  <p className="text-sm text-slate-400">
                    Nenhuma atividade ainda.
                  </p>
                )}
              </ul>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UserAvatar() {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500"
      aria-hidden
    >
      <User className="h-4 w-4" />
    </div>
  );
}

function QuickAction({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
    >
      {icon}
      {label}
    </button>
  );
}

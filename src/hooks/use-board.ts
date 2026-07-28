"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  addChecklistItem,
  createCard,
  createColumn,
  createComment,
  deleteCard,
  deleteChecklistItem,
  deleteColumn,
  deleteComment,
  fetchCards,
  fetchChecklistItems,
  fetchColumns,
  fetchCommentCounts,
  fetchComments,
  fetchTemplates,
  moveCard,
  reorderColumns,
  seedDefaultChecklists,
  toggleChecklistItem,
  updateCard,
  updateChecklistItemLabel,
  updateColumn,
  updateComment,
} from "@/lib/api";
import { supabase } from "@/lib/supabase/client";
import { tryGetCompanySlug } from "@/lib/company-scope";
import type { CardChecklistItem, Column } from "@/lib/types";
import { useCompany } from "@/hooks/use-company";

const companyPart = () => tryGetCompanySlug() ?? "none";

export const queryKeys = {
  columns: (slug?: string) => ["columns", slug ?? companyPart()] as const,
  cards: (slug?: string) => ["cards", slug ?? companyPart()] as const,
  checklist: (slug?: string) => ["checklist", slug ?? companyPart()] as const,
  templates: (slug?: string) => ["templates", slug ?? companyPart()] as const,
  commentCounts: (slug?: string) =>
    ["commentCounts", slug ?? companyPart()] as const,
  comments: (cardId: string, slug?: string) =>
    ["comments", slug ?? companyPart(), cardId] as const,
  siteActivityHistory: (siteId: string, slug?: string) =>
    ["site-activity-history", slug ?? companyPart(), siteId] as const,
};

/** Subscribe once at the app shell — do not call from every consumer of useBoardData. */
export function useBoardRealtime() {
  const qc = useQueryClient();
  const { companySlug } = useCompany();

  useEffect(() => {
    if (!companySlug) return;

    const channel = supabase
      .channel(`sitebook-realtime-${companySlug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cards" },
        () => {
          qc.invalidateQueries({ queryKey: queryKeys.cards(companySlug) });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "columns" },
        () => {
          qc.invalidateQueries({ queryKey: queryKeys.columns(companySlug) });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "card_checklist_items" },
        () => {
          qc.invalidateQueries({ queryKey: queryKeys.checklist(companySlug) });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        (payload) => {
          const cardId =
            (payload.new as { card_id?: string })?.card_id ??
            (payload.old as { card_id?: string })?.card_id;
          if (cardId) {
            qc.invalidateQueries({
              queryKey: queryKeys.comments(cardId, companySlug),
            });
          }
          qc.invalidateQueries({
            queryKey: queryKeys.commentCounts(companySlug),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, companySlug]);
}

export function useBoardData() {
  const { companySlug } = useCompany();
  const enabled = !!companySlug;

  const columnsQuery = useQuery({
    queryKey: queryKeys.columns(companySlug),
    queryFn: () => fetchColumns(companySlug),
    enabled,
    staleTime: 30_000,
  });

  const cardsQuery = useQuery({
    queryKey: queryKeys.cards(companySlug),
    queryFn: () => fetchCards(companySlug),
    enabled,
    staleTime: 30_000,
  });

  const checklistQuery = useQuery({
    queryKey: queryKeys.checklist(companySlug),
    queryFn: () => fetchChecklistItems(companySlug),
    enabled,
    staleTime: 30_000,
  });

  const templatesQuery = useQuery({
    queryKey: queryKeys.templates(companySlug),
    queryFn: () => fetchTemplates(companySlug),
    enabled,
    staleTime: 60_000,
  });

  const commentCountsQuery = useQuery({
    queryKey: queryKeys.commentCounts(companySlug),
    queryFn: () => fetchCommentCounts(companySlug),
    enabled,
    staleTime: 30_000,
  });

  // Hard tenant fence — never surface another company's rows from a stale cache.
  const columns = (columnsQuery.data ?? []).filter(
    (c) => c.company_slug === companySlug
  );
  const cards = (cardsQuery.data ?? []).filter(
    (c) => c.company_slug === companySlug
  );
  const checklist = (checklistQuery.data ?? []).filter(
    (i) => i.company_slug === companySlug
  );
  const templates = (templatesQuery.data ?? []).filter(
    (t) => !t.company_slug || t.company_slug === companySlug
  );

  return {
    columns,
    cards,
    checklist,
    templates,
    commentCounts: commentCountsQuery.data ?? {},
    companySlug,
    isLoading:
      enabled &&
      (columnsQuery.isLoading ||
        cardsQuery.isLoading ||
        checklistQuery.isLoading ||
        templatesQuery.isLoading),
    isError:
      columnsQuery.isError ||
      cardsQuery.isError ||
      checklistQuery.isError ||
      templatesQuery.isError,
  };
}

export function useCardProgress(checklist: CardChecklistItem[]) {
  const map = new Map<string, { completed: number; total: number }>();
  for (const item of checklist) {
    const current = map.get(item.card_id) ?? { completed: 0, total: 0 };
    current.total += 1;
    if (item.is_completed) current.completed += 1;
    map.set(item.card_id, current);
  }
  return map;
}

export function useBoardMutations() {
  const qc = useQueryClient();
  const { companySlug } = useCompany();

  const invalidateBoard = () => {
    qc.invalidateQueries({ queryKey: queryKeys.columns(companySlug) });
    qc.invalidateQueries({ queryKey: queryKeys.cards(companySlug) });
    qc.invalidateQueries({ queryKey: queryKeys.checklist(companySlug) });
  };

  const addColumn = useMutation({
    mutationFn: (name: string) => createColumn(name),
    onSuccess: () => {
      invalidateBoard();
      toast.success("Coluna criada");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao criar coluna"),
  });

  const renameColumn = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateColumn(id, { name }),
    onSuccess: () => {
      invalidateBoard();
      toast.success("Coluna atualizada");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao atualizar coluna"),
  });

  const removeColumn = useMutation({
    mutationFn: (id: string) => deleteColumn(id),
    onSuccess: () => {
      invalidateBoard();
      toast.success("Coluna excluída");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao excluir coluna"),
  });

  const relocateColumns = useMutation({
    mutationFn: (orderedIds: string[]) => reorderColumns(orderedIds),
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: queryKeys.columns(companySlug) });
      const previous = qc.getQueryData(queryKeys.columns(companySlug));
      qc.setQueryData(
        queryKeys.columns(companySlug),
        (old: Column[] | undefined) => {
          if (!old) return old;
          const byId = new Map(old.map((c) => [c.id, c]));
          return orderedIds
            .map((id, position) => {
              const col = byId.get(id);
              return col ? { ...col, position } : null;
            })
            .filter((c): c is Column => c !== null);
        }
      );
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.columns(companySlug), ctx.previous);
      toast.error(e.message || "Erro ao reordenar colunas");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.columns(companySlug) });
    },
  });

  const addCard = useMutation({
    mutationFn: ({
      id,
      columnId,
      attribute,
    }: {
      id: string;
      columnId: string;
      attribute: string;
    }) => createCard(id, columnId, attribute),
    onSuccess: () => {
      invalidateBoard();
      toast.success("Site Book criado");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao criar card"),
  });

  const removeCard = useMutation({
    mutationFn: (id: string) => deleteCard(id),
    onSuccess: () => {
      invalidateBoard();
      toast.success("Card excluído");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao excluir card"),
  });

  const editCard = useMutation({
    mutationFn: ({
      id,
      ...updates
    }: {
      id: string;
      title?: string;
      description?: string;
      column_id?: string;
      attribute?: string;
      state?: string;
    }) => updateCard(id, updates),
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: queryKeys.cards(companySlug) });
      const previous = qc.getQueryData(queryKeys.cards(companySlug));
      const optimistic =
        updates.title !== undefined && updates.state === undefined
          ? {
              ...updates,
              state: updates.title.trim().substring(0, 2).toUpperCase(),
            }
          : updates;
      qc.setQueryData(
        queryKeys.cards(companySlug),
        (old: Awaited<ReturnType<typeof fetchCards>> | undefined) =>
          old?.map((c) => (c.id === id ? { ...c, ...optimistic } : c))
      );
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.cards(companySlug), ctx.previous);
      toast.error(e.message || "Erro ao atualizar card");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cards(companySlug) });
    },
  });

  const relocateCard = useMutation({
    mutationFn: moveCard,
    onMutate: async (vars) => {
      const previous = qc.getQueryData(queryKeys.cards(companySlug));

      // Apply optimistic move synchronously before any await
      qc.setQueryData(
        queryKeys.cards(companySlug),
        (old: Awaited<ReturnType<typeof fetchCards>> | undefined) => {
          if (!old) return old;
          const cards = [...old];
          const idx = cards.findIndex((c) => c.id === vars.cardId);
          if (idx === -1) return old;
          const [moving] = cards.splice(idx, 1);
          const updated = { ...moving, column_id: vars.toColumnId };
          const sameColumn = cards
            .filter((c) => c.column_id === vars.toColumnId)
            .sort((a, b) => a.position - b.position);
          sameColumn.splice(vars.toPosition, 0, updated);
          const others = cards.filter((c) => c.column_id !== vars.toColumnId);
          const reindexed = sameColumn.map((c, i) => ({
            ...c,
            position: i,
            column_id: vars.toColumnId,
          }));
          if (vars.fromColumnId !== vars.toColumnId) {
            const source = others
              .filter((c) => c.column_id === vars.fromColumnId)
              .sort((a, b) => a.position - b.position)
              .map((c, i) => ({ ...c, position: i }));
            const rest = others.filter(
              (c) => c.column_id !== vars.fromColumnId
            );
            return [...rest, ...source, ...reindexed];
          }
          return [...others, ...reindexed];
        }
      );

      await qc.cancelQueries({ queryKey: queryKeys.cards(companySlug) });
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.cards(companySlug), ctx.previous);
      toast.error(e.message || "Erro ao mover card");
    },
    onSettled: () => {
      // Background reconcile — UI already updated optimistically
      void qc.invalidateQueries({ queryKey: queryKeys.cards(companySlug) });
    },
  });

  const setChecklist = useMutation({
    mutationFn: ({
      itemId,
      isCompleted,
    }: {
      itemId: string;
      isCompleted: boolean;
    }) => toggleChecklistItem(itemId, isCompleted),
    onMutate: async ({ itemId, isCompleted }) => {
      await qc.cancelQueries({ queryKey: queryKeys.checklist(companySlug) });
      const previous = qc.getQueryData(queryKeys.checklist(companySlug));
      qc.setQueryData(
        queryKeys.checklist(companySlug),
        (old: CardChecklistItem[] | undefined) =>
          old?.map((i) =>
            i.id === itemId ? { ...i, is_completed: isCompleted } : i
          )
      );
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.checklist(companySlug), ctx.previous);
      toast.error(e.message || "Erro ao atualizar checklist");
    },
    onSuccess: (data) => {
      toast.success("Checklist atualizado");
      if (data?.card_id) {
        qc.invalidateQueries({
          queryKey: queryKeys.siteActivityHistory(data.card_id, companySlug),
        });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.checklist(companySlug) });
    },
  });

  const renameChecklistItem = useMutation({
    mutationFn: ({ itemId, label }: { itemId: string; label: string }) =>
      updateChecklistItemLabel(itemId, label),
    onMutate: async ({ itemId, label }) => {
      await qc.cancelQueries({ queryKey: queryKeys.checklist(companySlug) });
      const previous = qc.getQueryData(queryKeys.checklist(companySlug));
      qc.setQueryData(
        queryKeys.checklist(companySlug),
        (old: CardChecklistItem[] | undefined) =>
          old?.map((i) =>
            i.id === itemId ? { ...i, label: label.trim() || null } : i
          )
      );
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.checklist(companySlug), ctx.previous);
      toast.error(e.message || "Erro ao renomear item");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.checklist(companySlug) });
    },
  });

  const createChecklistItem = useMutation({
    mutationFn: addChecklistItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.checklist(companySlug) });
      toast.success("Item adicionado");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao adicionar item"),
  });

  const removeChecklistItem = useMutation({
    mutationFn: deleteChecklistItem,
    onMutate: async (itemId) => {
      await qc.cancelQueries({ queryKey: queryKeys.checklist(companySlug) });
      const previous = qc.getQueryData(queryKeys.checklist(companySlug));
      qc.setQueryData(
        queryKeys.checklist(companySlug),
        (old: CardChecklistItem[] | undefined) =>
          old?.filter((i) => i.id !== itemId)
      );
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.checklist(companySlug), ctx.previous);
      toast.error(e.message || "Erro ao excluir item");
    },
    onSuccess: () => toast.success("Item excluído"),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.checklist(companySlug) });
    },
  });

  const applyDefaultChecklists = useMutation({
    mutationFn: (cardId: string) => seedDefaultChecklists(cardId),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: queryKeys.checklist(companySlug) });
      qc.invalidateQueries({ queryKey: queryKeys.templates(companySlug) });
      if (result.added === 0) {
        toast.message("Checklists padrão já estão neste card");
      } else {
        toast.success(`Checklists padrão aplicados (${result.added} itens)`);
      }
    },
    onError: (e: Error) =>
      toast.error(
        e.message || "Erro ao adicionar checklists padrão"
      ),
  });

  return {
    addColumn,
    renameColumn,
    removeColumn,
    relocateColumns,
    addCard,
    removeCard,
    editCard,
    relocateCard,
    setChecklist,
    renameChecklistItem,
    createChecklistItem,
    removeChecklistItem,
    applyDefaultChecklists,
  };
}

export function useComments(cardId: string | null) {
  const qc = useQueryClient();
  const { companySlug } = useCompany();

  const query = useQuery({
    queryKey: cardId
      ? queryKeys.comments(cardId, companySlug)
      : ["comments", "none"],
    queryFn: () => fetchComments(cardId!),
    enabled: !!cardId && !!companySlug,
  });

  const add = useMutation({
    mutationFn: ({
      author,
      content,
    }: {
      author: string;
      content: string;
    }) => createComment(cardId!, author, content),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.comments(cardId!, companySlug),
      });
      qc.invalidateQueries({ queryKey: queryKeys.commentCounts(companySlug) });
      toast.success("Comentário adicionado");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao comentar"),
  });

  const edit = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      updateComment(id, content),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.comments(cardId!, companySlug),
      });
      toast.success("Comentário atualizado");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao editar"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.comments(cardId!, companySlug),
      });
      qc.invalidateQueries({ queryKey: queryKeys.commentCounts(companySlug) });
      toast.success("Comentário excluído");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao excluir"),
  });

  return { ...query, add, edit, remove };
}

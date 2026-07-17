import { supabase } from "@/lib/supabase/client";
import type {
  Card,
  CardChecklistItem,
  ChecklistTemplate,
  Column,
  Comment,
} from "@/lib/types";

export async function fetchColumns(): Promise<Column[]> {
  const { data, error } = await supabase
    .from("columns")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createColumn(name: string): Promise<Column> {
  const { data: max } = await supabase
    .from("columns")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("columns")
    .insert({ name, position: (max?.position ?? -1) + 1 })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateColumn(
  id: string,
  updates: Partial<Pick<Column, "name" | "position">>
): Promise<Column> {
  const { data, error } = await supabase
    .from("columns")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteColumn(id: string): Promise<void> {
  const { error } = await supabase.from("columns").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchCards(): Promise<Card[]> {
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCard(
  id: string,
  columnId: string,
  title?: string
): Promise<Card> {
  const trimmed = id.trim().toUpperCase();
  const { data: max } = await supabase
    .from("cards")
    .select("position")
    .eq("column_id", columnId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("cards")
    .insert({
      id: trimmed,
      title: (title ?? trimmed).trim() || trimmed,
      description: "",
      column_id: columnId,
      position: (max?.position ?? -1) + 1,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCard(
  id: string,
  updates: Partial<
    Pick<Card, "column_id" | "position" | "title" | "description">
  >
): Promise<Card> {
  const { data, error } = await supabase
    .from("cards")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase.from("cards").delete().eq("id", id);
  if (error) throw error;
}

export async function moveCard(params: {
  cardId: string;
  toColumnId: string;
  toPosition: number;
  fromColumnId: string;
}): Promise<void> {
  const { cardId, toColumnId, toPosition, fromColumnId } = params;

  const { data: cards, error: fetchError } = await supabase
    .from("cards")
    .select("*")
    .in("column_id", Array.from(new Set([fromColumnId, toColumnId])));
  if (fetchError) throw fetchError;

  const moving = cards?.find((c) => c.id === cardId);
  if (!moving) throw new Error("Card não encontrado");

  const targetCards = (cards ?? [])
    .filter((c) => c.column_id === toColumnId && c.id !== cardId)
    .sort((a, b) => a.position - b.position);

  targetCards.splice(toPosition, 0, { ...moving, column_id: toColumnId });

  const updates = targetCards.map((c, index) => ({
    id: c.id,
    column_id: toColumnId,
    position: index,
  }));

  if (fromColumnId !== toColumnId) {
    const sourceCards = (cards ?? [])
      .filter((c) => c.column_id === fromColumnId && c.id !== cardId)
      .sort((a, b) => a.position - b.position)
      .map((c, index) => ({
        id: c.id,
        column_id: fromColumnId,
        position: index,
      }));
    updates.push(...sourceCards);
  }

  for (const u of updates) {
    const { error } = await supabase
      .from("cards")
      .update({ column_id: u.column_id, position: u.position })
      .eq("id", u.id);
    if (error) throw error;
  }
}

export async function fetchChecklistItems(): Promise<CardChecklistItem[]> {
  const { data, error } = await supabase
    .from("card_checklist_items")
    .select(
      `*, checklist_templates(*, checklist_categories(*))`
    );
  if (error) throw error;
  return (data as CardChecklistItem[]) ?? [];
}

export async function toggleChecklistItem(
  itemId: string,
  isCompleted: boolean
): Promise<CardChecklistItem> {
  const { data, error } = await supabase
    .from("card_checklist_items")
    .update({ is_completed: isCompleted })
    .eq("id", itemId)
    .select(`*, checklist_templates(*, checklist_categories(*))`)
    .single();
  if (error) throw error;
  return data as CardChecklistItem;
}

export async function fetchTemplates(): Promise<ChecklistTemplate[]> {
  const { data, error } = await supabase
    .from("checklist_templates")
    .select(`*, checklist_categories(*)`)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as ChecklistTemplate[]) ?? [];
}

export async function fetchComments(cardId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("card_id", cardId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createComment(
  cardId: string,
  author: string,
  content: string
): Promise<Comment> {
  const { data, error } = await supabase
    .from("comments")
    .insert({ card_id: cardId, author, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateComment(
  id: string,
  content: string
): Promise<Comment> {
  const { data, error } = await supabase
    .from("comments")
    .update({ content })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) throw error;
}

import { supabase } from "@/lib/supabase/client";
import { DEFAULT_CHECKLIST } from "@/lib/checklist-defaults";
import {
  extractSiteState,
  type Card,
  type CardChecklistItem,
  type ChecklistTemplate,
  type Column,
  type Comment,
  type CommentWithCard,
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

export async function reorderColumns(orderedIds: string[]): Promise<void> {
  const results = await Promise.all(
    orderedIds.map((id, position) =>
      supabase.from("columns").update({ position }).eq("id", id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
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
  attribute: string,
  title?: string
): Promise<Card> {
  const trimmed = id.trim().toUpperCase();
  const resolvedTitle = (title ?? trimmed).trim() || trimmed;
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
      title: resolvedTitle,
      description: "",
      attribute: attribute.trim(),
      state: extractSiteState(resolvedTitle),
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
    Pick<
      Card,
      "column_id" | "position" | "title" | "description" | "attribute" | "state"
    >
  >
): Promise<Card> {
  const payload = { ...updates };
  if (payload.title !== undefined && payload.state === undefined) {
    payload.state = extractSiteState(payload.title);
  }

  const { data, error } = await supabase
    .from("cards")
    .update(payload)
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
      `*, checklist_templates(*, checklist_categories(*)), checklist_categories(*)`
    )
    .order("id", { ascending: true });
  if (error) throw error;
  return (data as CardChecklistItem[]) ?? [];
}

const CHECKLIST_SELECT =
  `*, checklist_templates(*, checklist_categories(*)), checklist_categories(*)`;

export async function toggleChecklistItem(
  itemId: string,
  isCompleted: boolean
): Promise<CardChecklistItem> {
  const { data, error } = await supabase
    .from("card_checklist_items")
    .update({ is_completed: isCompleted })
    .eq("id", itemId)
    .select(CHECKLIST_SELECT)
    .single();
  if (error) throw error;
  return data as CardChecklistItem;
}

export async function updateChecklistItemLabel(
  itemId: string,
  label: string
): Promise<CardChecklistItem> {
  const { data, error } = await supabase
    .from("card_checklist_items")
    .update({ label: label.trim() || null })
    .eq("id", itemId)
    .select(CHECKLIST_SELECT)
    .single();
  if (error) throw error;
  return data as CardChecklistItem;
}

export async function addChecklistItem(params: {
  cardId: string;
  categoryId: string;
  label?: string;
}): Promise<CardChecklistItem> {
  const { data: max } = await supabase
    .from("card_checklist_items")
    .select("sort_order")
    .eq("card_id", params.cardId)
    .eq("category_id", params.categoryId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("card_checklist_items")
    .insert({
      card_id: params.cardId,
      category_id: params.categoryId,
      template_id: null,
      label: params.label?.trim() || "",
      is_completed: false,
      sort_order: (max?.sort_order ?? -1) + 1,
    })
    .select(CHECKLIST_SELECT)
    .single();
  if (error) throw error;
  return data as CardChecklistItem;
}

export async function deleteChecklistItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from("card_checklist_items")
    .delete()
    .eq("id", itemId);
  if (error) throw error;
}

export async function seedDefaultChecklists(
  cardId: string
): Promise<{ items: CardChecklistItem[]; added: number }> {
  const { data: categories, error: catErr } = await supabase
    .from("checklist_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (catErr) throw catErr;

  const { data: templates, error: tmplErr } = await supabase
    .from("checklist_templates")
    .select("*")
    .order("sort_order", { ascending: true });
  if (tmplErr) throw tmplErr;

  const cats = [...(categories ?? [])];
  const tmpls = [...(templates ?? [])];
  let catSort = cats.reduce((m, c) => Math.max(m, c.sort_order), -1);

  const ensureCategory = async (name: string) => {
    const found = cats.find((c) => c.name === name);
    if (found) return found;
    catSort += 1;
    const { data, error } = await supabase
      .from("checklist_categories")
      .insert({ name, sort_order: catSort })
      .select()
      .single();
    if (error) throw error;
    cats.push(data);
    return data;
  };

  const ensureTemplate = async (
    categoryId: string,
    label: string,
    sortOrder: number
  ) => {
    const found = tmpls.find(
      (t) => t.category_id === categoryId && t.label === label
    );
    if (found) return found;
    const { data, error } = await supabase
      .from("checklist_templates")
      .insert({ category_id: categoryId, label, sort_order: sortOrder })
      .select()
      .single();
    if (error) throw error;
    tmpls.push(data);
    return data;
  };

  const resolved: {
    template_id: string;
    category_id: string;
    sort_order: number;
  }[] = [];

  for (const group of DEFAULT_CHECKLIST) {
    const category = await ensureCategory(group.category);
    for (let i = 0; i < group.items.length; i++) {
      const template = await ensureTemplate(category.id, group.items[i], i);
      resolved.push({
        template_id: template.id,
        category_id: category.id,
        sort_order: i,
      });
    }
  }

  // Replace this card's checklist with exactly the default structure
  const { error: deleteErr } = await supabase
    .from("card_checklist_items")
    .delete()
    .eq("card_id", cardId);
  if (deleteErr) throw deleteErr;

  const toInsert = resolved.map((r) => ({
    card_id: cardId,
    template_id: r.template_id,
    category_id: r.category_id,
    label: null as string | null,
    is_completed: false,
    sort_order: r.sort_order,
  }));

  const { error: insertErr } = await supabase
    .from("card_checklist_items")
    .insert(toInsert);
  if (insertErr) throw insertErr;

  const items = await fetchChecklistItems().then((all) =>
    all.filter((i) => i.card_id === cardId)
  );
  return { items, added: toInsert.length };
}

export async function fetchTemplates(): Promise<ChecklistTemplate[]> {
  const { data, error } = await supabase
    .from("checklist_templates")
    .select(`*, checklist_categories(*)`)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as ChecklistTemplate[]) ?? [];
}

export async function fetchCommentCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("comments").select("card_id");
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.card_id] = (counts[row.card_id] ?? 0) + 1;
  }
  return counts;
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

export async function searchComments(
  term: string
): Promise<CommentWithCard[]> {
  const trimmed = term.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase
    .from("comments")
    .select("*, cards(id, title, state, attribute)")
    .ilike("content", `%${trimmed}%`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as CommentWithCard[]) ?? [];
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

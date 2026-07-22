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
  type TeamTask,
  type TeamTaskStatus,
  type TeamChecklistSection,
  type TeamChecklistItem,
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

export async function searchComments(params: {
  term?: string;
  author?: string | null;
  sort?: "newest" | "oldest";
}): Promise<CommentWithCard[]> {
  const term = params.term?.trim() ?? "";
  const author = params.author?.trim() || null;
  const ascending = params.sort === "oldest";

  if (!term && !author) return [];

  let query = supabase
    .from("comments")
    .select("*, cards(id, title, state, attribute)");

  if (term) {
    query = query.ilike("content", `%${term}%`);
  }
  if (author) {
    query = query.eq("author", author);
  }

  const { data, error } = await query.order("created_at", { ascending });
  if (error) throw error;
  return (data as CommentWithCard[]) ?? [];
}

export async function fetchCommentAuthors(): Promise<string[]> {
  const { data, error } = await supabase.from("comments").select("author");
  if (error) throw error;

  const authors = new Set<string>();
  for (const row of data ?? []) {
    const name = row.author?.trim();
    if (name) authors.add(name);
  }

  return Array.from(authors).sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" })
  );
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

export async function fetchTeamTasks(): Promise<TeamTask[]> {
  const { data, error } = await supabase
    .from("team_tasks")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return (data as TeamTask[]) ?? [];
}

export async function createTeamTask(params: {
  title: string;
  description?: string;
  status?: TeamTaskStatus;
}): Promise<TeamTask> {
  const status = params.status ?? "todo";
  const { data: max } = await supabase
    .from("team_tasks")
    .select("position")
    .eq("status", status)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("team_tasks")
    .insert({
      title: params.title.trim(),
      description: params.description?.trim() ?? "",
      status,
      position: (max?.position ?? -1) + 1,
    })
    .select()
    .single();
  if (error) throw error;
  return data as TeamTask;
}

export async function updateTeamTask(
  id: string,
  updates: Partial<
    Pick<TeamTask, "title" | "description" | "status" | "position">
  >
): Promise<TeamTask> {
  const { data, error } = await supabase
    .from("team_tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as TeamTask;
}

export async function deleteTeamTask(id: string): Promise<void> {
  const { error } = await supabase.from("team_tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function moveTeamTask(params: {
  taskId: string;
  toStatus: TeamTaskStatus;
  toPosition: number;
  fromStatus: TeamTaskStatus;
}): Promise<void> {
  const { taskId, toStatus, toPosition, fromStatus } = params;

  const { data: tasks, error: fetchError } = await supabase
    .from("team_tasks")
    .select("*")
    .in("status", Array.from(new Set([fromStatus, toStatus])));
  if (fetchError) throw fetchError;

  const moving = (tasks as TeamTask[] | null)?.find((t) => t.id === taskId);
  if (!moving) throw new Error("Tarefa não encontrada");

  const targetTasks = ((tasks as TeamTask[]) ?? [])
    .filter((t) => t.status === toStatus && t.id !== taskId)
    .sort((a, b) => a.position - b.position);

  targetTasks.splice(toPosition, 0, { ...moving, status: toStatus });

  const updates = targetTasks.map((t, index) => ({
    id: t.id,
    status: toStatus,
    position: index,
  }));

  if (fromStatus !== toStatus) {
    const sourceTasks = ((tasks as TeamTask[]) ?? [])
      .filter((t) => t.status === fromStatus && t.id !== taskId)
      .sort((a, b) => a.position - b.position)
      .map((t, index) => ({
        id: t.id,
        status: fromStatus,
        position: index,
      }));
    updates.push(...sourceTasks);
  }

  for (const u of updates) {
    const { error } = await supabase
      .from("team_tasks")
      .update({ status: u.status, position: u.position })
      .eq("id", u.id);
    if (error) throw error;
  }
}

export async function fetchTeamChecklistProgress(): Promise<
  Record<string, { completed: number; total: number }>
> {
  const { data, error } = await supabase
    .from("team_task_checklist_items")
    .select("team_task_id, is_completed");
  if (error) throw error;

  const progress: Record<string, { completed: number; total: number }> = {};
  for (const row of data ?? []) {
    const key = row.team_task_id as string;
    const current = progress[key] ?? { completed: 0, total: 0 };
    current.total += 1;
    if (row.is_completed) current.completed += 1;
    progress[key] = current;
  }
  return progress;
}

export async function fetchTeamTaskChecklist(teamTaskId: string): Promise<{
  sections: TeamChecklistSection[];
  items: TeamChecklistItem[];
}> {
  const [sectionsRes, itemsRes] = await Promise.all([
    supabase
      .from("team_task_checklist_sections")
      .select("*")
      .eq("team_task_id", teamTaskId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("team_task_checklist_items")
      .select("*")
      .eq("team_task_id", teamTaskId)
      .order("sort_order", { ascending: true }),
  ]);

  if (sectionsRes.error) throw sectionsRes.error;
  if (itemsRes.error) throw itemsRes.error;

  return {
    sections: (sectionsRes.data as TeamChecklistSection[]) ?? [],
    items: (itemsRes.data as TeamChecklistItem[]) ?? [],
  };
}

export async function createTeamChecklistSection(params: {
  teamTaskId: string;
  title: string;
  parentId?: string | null;
}): Promise<TeamChecklistSection> {
  const parentId = params.parentId ?? null;
  let query = supabase
    .from("team_task_checklist_sections")
    .select("sort_order")
    .eq("team_task_id", params.teamTaskId)
    .order("sort_order", { ascending: false })
    .limit(1);

  query = parentId
    ? query.eq("parent_id", parentId)
    : query.is("parent_id", null);

  const { data: max } = await query.maybeSingle();

  const { data, error } = await supabase
    .from("team_task_checklist_sections")
    .insert({
      team_task_id: params.teamTaskId,
      parent_id: parentId,
      title: params.title.trim() || (parentId ? "Novo subtópico" : "Novo tópico"),
      sort_order: (max?.sort_order ?? -1) + 1,
    })
    .select()
    .single();
  if (error) throw error;
  return data as TeamChecklistSection;
}

export async function updateTeamChecklistSection(
  id: string,
  updates: Partial<Pick<TeamChecklistSection, "title" | "sort_order">>
): Promise<TeamChecklistSection> {
  const { data, error } = await supabase
    .from("team_task_checklist_sections")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as TeamChecklistSection;
}

export async function deleteTeamChecklistSection(id: string): Promise<void> {
  const { error } = await supabase
    .from("team_task_checklist_sections")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function createTeamChecklistItem(params: {
  teamTaskId: string;
  sectionId: string;
  label?: string;
}): Promise<TeamChecklistItem> {
  const { data: max } = await supabase
    .from("team_task_checklist_items")
    .select("sort_order")
    .eq("section_id", params.sectionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("team_task_checklist_items")
    .insert({
      team_task_id: params.teamTaskId,
      section_id: params.sectionId,
      label: params.label?.trim() ?? "",
      is_completed: false,
      sort_order: (max?.sort_order ?? -1) + 1,
    })
    .select()
    .single();
  if (error) throw error;
  return data as TeamChecklistItem;
}

export async function toggleTeamChecklistItem(
  id: string,
  isCompleted: boolean
): Promise<TeamChecklistItem> {
  const { data, error } = await supabase
    .from("team_task_checklist_items")
    .update({ is_completed: isCompleted })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as TeamChecklistItem;
}

export async function updateTeamChecklistItemLabel(
  id: string,
  label: string
): Promise<TeamChecklistItem> {
  const { data, error } = await supabase
    .from("team_task_checklist_items")
    .update({ label: label.trim() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as TeamChecklistItem;
}

export async function deleteTeamChecklistItem(id: string): Promise<void> {
  const { error } = await supabase
    .from("team_task_checklist_items")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function updateTeamTaskDetails(
  id: string,
  updates: Partial<Pick<TeamTask, "title" | "description">>
): Promise<TeamTask> {
  const { data, error } = await supabase
    .from("team_tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as TeamTask;
}

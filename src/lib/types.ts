export type Column = {
  id: string;
  name: string;
  position: number;
  company_slug?: string;
  created_at: string;
};

export const SITE_ATTRIBUTES = [
  "-",
  "Poste - Serv. Próprio",
  "Poste - Serv. Terceiro",
  "Torre - Serv. Próprio",
  "Torre - Serv. Terceiro",
  "ROOFTOP - Serv. Próprio",
  "ROOFTOP - Serv. Terceiro",
] as const;

export type SiteAttribute = (typeof SITE_ATTRIBUTES)[number];

/** True when attribute is unset / placeholder dash. */
export function isEmptySiteAttribute(
  value: string | null | undefined
): boolean {
  const trimmed = value?.trim();
  return !trimmed || trimmed === "-";
}

/** Display attribute as "-" when empty/null. */
export function formatSiteAttribute(
  value: string | null | undefined
): string {
  if (isEmptySiteAttribute(value)) return "-";
  return value!.trim();
}

/** Select value: map null/empty to the "-" option. */
export function siteAttributeSelectValue(
  value: string | null | undefined
): string {
  return formatSiteAttribute(value);
}

/** Persist attribute: store "-" for the empty option (never force a real type). */
export function normalizeSiteAttributeForSave(
  value: string | null | undefined
): string {
  return formatSiteAttribute(value);
}

/** First 2 letters of the site title/ID, uppercased (UF). */
export function extractSiteState(titleOrId: string): string {
  return titleOrId.trim().substring(0, 2).toUpperCase();
}

export type Card = {
  id: string;
  title: string;
  description: string;
  /** Nullable for legacy rows created before this field existed */
  attribute: string | null;
  /** UF derived from title; nullable for legacy rows */
  state: string | null;
  /** Optional construction start date (YYYY-MM-DD) */
  start_date?: string | null;
  column_id: string;
  position: number;
  company_slug?: string;
  created_at: string;
  updated_at: string;
};

/** Formats site start_date as DD/MM/AAAA, or "-" when empty. */
export function formatSiteStartDate(value: string | null | undefined): string {
  if (!value) return "-";
  const raw = value.slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return "-";
  return `${d}/${m}/${y}`;
}

export type ChecklistCategory = {
  id: string;
  name: string;
  sort_order: number;
};

export type ChecklistTemplate = {
  id: string;
  category_id: string;
  label: string;
  sort_order: number;
  company_slug?: string;
  checklist_categories?: ChecklistCategory;
};

export type CardChecklistItem = {
  id: string;
  card_id: string;
  template_id: string | null;
  category_id: string | null;
  label: string | null;
  sort_order: number;
  is_completed: boolean;
  company_slug?: string;
  checklist_templates?: ChecklistTemplate & {
    checklist_categories?: ChecklistCategory;
  };
  checklist_categories?: ChecklistCategory;
};

export type Comment = {
  id: string;
  card_id: string;
  author: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type CommentWithCard = Comment & {
  cards: Pick<Card, "id" | "title" | "state" | "attribute"> | null;
};

export type CardWithProgress = Card & {
  completed: number;
  total: number;
};

export type FilterStatus = "completed" | "pending";

export const TEAM_TASK_STATUSES = ["todo", "in_progress", "done"] as const;

export type TeamTaskStatus = (typeof TEAM_TASK_STATUSES)[number];

export const TEAM_TASK_STATUS_LABELS: Record<TeamTaskStatus, string> = {
  todo: "A Fazer",
  in_progress: "Em Andamento",
  done: "Concluído",
};

export type TeamTask = {
  id: string;
  title: string;
  description: string;
  status: TeamTaskStatus;
  position: number;
  created_at: string;
};

/** Topic (parent_id null) or subtopic (parent_id set) within a team task checklist. */
export type TeamChecklistSection = {
  id: string;
  team_task_id: string;
  parent_id: string | null;
  title: string;
  sort_order: number;
  created_at: string;
};

export type TeamChecklistItem = {
  id: string;
  team_task_id: string;
  section_id: string;
  label: string;
  is_completed: boolean;
  sort_order: number;
  created_at: string;
};

export type TeamTaskHistory = {
  id: string;
  team_task_id: string;
  action_description: string;
  created_at: string;
};

/** Checklist activity log for a site (card). */
export type SiteActivityHistory = {
  id: string;
  site_id: string;
  action_description: string;
  created_at: string;
};

export type ActivityHistoryEntry = {
  id: string;
  action_description: string;
  created_at: string;
};

export type SiteReminder = {
  id: string;
  site_id: string;
  description: string;
  reminder_date: string;
  is_completed: boolean;
  company_slug?: string;
  created_at: string;
  cards?: Pick<Card, "id" | "title"> | null;
};

export type Company = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  created_at: string;
};

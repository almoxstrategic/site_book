export type Column = {
  id: string;
  name: string;
  position: number;
  created_at: string;
};

export const SITE_ATTRIBUTES = [
  "Poste - Serv. Próprio",
  "Poste - Serv. Terceiro",
  "Torre - Serv. Próprio",
  "Torre - Serv. Terceiro",
  "ROOFTOP - Serv. Próprio",
  "ROOFTOP - Serv. Terceiro",
] as const;

export type SiteAttribute = (typeof SITE_ATTRIBUTES)[number];

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
  column_id: string;
  position: number;
  created_at: string;
  updated_at: string;
};

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

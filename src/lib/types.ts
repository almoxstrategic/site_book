export type Column = {
  id: string;
  name: string;
  position: number;
  created_at: string;
};

export type Card = {
  id: string;
  title: string;
  description: string;
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

export type CardWithProgress = Card & {
  completed: number;
  total: number;
};

export type FilterStatus = "completed" | "pending";

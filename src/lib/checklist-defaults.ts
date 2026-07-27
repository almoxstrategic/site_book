import { COMPANY_CHECKLIST_TEMPLATES } from "@/lib/checklist-templates";

/** Legacy Global defaults (Relatórios/export). Runtime seeding uses Supabase. */
export const DEFAULT_CHECKLIST = COMPANY_CHECKLIST_TEMPLATES.global;

export const VALID_TASK_LABELS = new Set(
  DEFAULT_CHECKLIST.flatMap((group) => group.items)
);

export function checklistItemLabel(item: {
  label?: string | null;
  checklist_templates?: { label?: string | null } | null;
}): string {
  return item.label?.trim() || item.checklist_templates?.label?.trim() || "Item";
}

-- Per-card checklist labels and custom items (template_id optional)
ALTER TABLE public.card_checklist_items
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.checklist_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.card_checklist_items
  ALTER COLUMN template_id DROP NOT NULL;

UPDATE public.card_checklist_items i
SET category_id = t.category_id
FROM public.checklist_templates t
WHERE i.template_id = t.id
  AND i.category_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS card_checklist_items_card_template_uidx
  ON public.card_checklist_items (card_id, template_id)
  WHERE template_id IS NOT NULL;

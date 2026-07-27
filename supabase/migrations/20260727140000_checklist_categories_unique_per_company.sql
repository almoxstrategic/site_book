-- Allow same checklist category names across companies
ALTER TABLE public.checklist_categories
  DROP CONSTRAINT IF EXISTS checklist_categories_name_key;

DROP INDEX IF EXISTS public.checklist_categories_name_key;

ALTER TABLE public.checklist_categories
  DROP CONSTRAINT IF EXISTS checklist_categories_name_company_key;

ALTER TABLE public.checklist_categories
  ADD CONSTRAINT checklist_categories_name_company_key
  UNIQUE (name, company_slug);

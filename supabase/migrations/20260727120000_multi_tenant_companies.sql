-- Multi-tenant: companies + company_slug on all main tables
-- Backfill existing rows as 'global' so current data keeps working.

CREATE TABLE IF NOT EXISTS public.companies (
  slug text PRIMARY KEY,
  id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  name text NOT NULL,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to companies"
  ON public.companies FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

GRANT ALL ON public.companies TO anon, authenticated;

INSERT INTO public.companies (slug, name, logo_url)
VALUES ('global', 'Global', null)
ON CONFLICT (slug) DO NOTHING;

-- Helper: add company_slug, backfill, NOT NULL + FK + index
-- columns
ALTER TABLE public.columns
  ADD COLUMN IF NOT EXISTS company_slug text REFERENCES public.companies(slug);
UPDATE public.columns SET company_slug = 'global' WHERE company_slug IS NULL;
ALTER TABLE public.columns ALTER COLUMN company_slug SET DEFAULT 'global';
ALTER TABLE public.columns ALTER COLUMN company_slug SET NOT NULL;
CREATE INDEX IF NOT EXISTS columns_company_slug_idx ON public.columns (company_slug, position);

-- cards (sites)
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS company_slug text REFERENCES public.companies(slug);
UPDATE public.cards SET company_slug = 'global' WHERE company_slug IS NULL;
ALTER TABLE public.cards ALTER COLUMN company_slug SET DEFAULT 'global';
ALTER TABLE public.cards ALTER COLUMN company_slug SET NOT NULL;
CREATE INDEX IF NOT EXISTS cards_company_slug_idx ON public.cards (company_slug, column_id, position);

-- card_checklist_items
ALTER TABLE public.card_checklist_items
  ADD COLUMN IF NOT EXISTS company_slug text REFERENCES public.companies(slug);
UPDATE public.card_checklist_items SET company_slug = 'global' WHERE company_slug IS NULL;
ALTER TABLE public.card_checklist_items ALTER COLUMN company_slug SET DEFAULT 'global';
ALTER TABLE public.card_checklist_items ALTER COLUMN company_slug SET NOT NULL;
CREATE INDEX IF NOT EXISTS card_checklist_items_company_slug_idx
  ON public.card_checklist_items (company_slug, card_id);

-- comments
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS company_slug text REFERENCES public.companies(slug);
UPDATE public.comments SET company_slug = 'global' WHERE company_slug IS NULL;
ALTER TABLE public.comments ALTER COLUMN company_slug SET DEFAULT 'global';
ALTER TABLE public.comments ALTER COLUMN company_slug SET NOT NULL;
CREATE INDEX IF NOT EXISTS comments_company_slug_idx ON public.comments (company_slug, card_id);

-- checklist_categories
ALTER TABLE public.checklist_categories
  ADD COLUMN IF NOT EXISTS company_slug text REFERENCES public.companies(slug);
UPDATE public.checklist_categories SET company_slug = 'global' WHERE company_slug IS NULL;
ALTER TABLE public.checklist_categories ALTER COLUMN company_slug SET DEFAULT 'global';
ALTER TABLE public.checklist_categories ALTER COLUMN company_slug SET NOT NULL;
CREATE INDEX IF NOT EXISTS checklist_categories_company_slug_idx
  ON public.checklist_categories (company_slug, sort_order);

-- checklist_templates
ALTER TABLE public.checklist_templates
  ADD COLUMN IF NOT EXISTS company_slug text REFERENCES public.companies(slug);
UPDATE public.checklist_templates SET company_slug = 'global' WHERE company_slug IS NULL;
ALTER TABLE public.checklist_templates ALTER COLUMN company_slug SET DEFAULT 'global';
ALTER TABLE public.checklist_templates ALTER COLUMN company_slug SET NOT NULL;
CREATE INDEX IF NOT EXISTS checklist_templates_company_slug_idx
  ON public.checklist_templates (company_slug, category_id, sort_order);

-- team_tasks
ALTER TABLE public.team_tasks
  ADD COLUMN IF NOT EXISTS company_slug text REFERENCES public.companies(slug);
UPDATE public.team_tasks SET company_slug = 'global' WHERE company_slug IS NULL;
ALTER TABLE public.team_tasks ALTER COLUMN company_slug SET DEFAULT 'global';
ALTER TABLE public.team_tasks ALTER COLUMN company_slug SET NOT NULL;
CREATE INDEX IF NOT EXISTS team_tasks_company_slug_idx
  ON public.team_tasks (company_slug, status, position);

-- team_task_checklist_sections
ALTER TABLE public.team_task_checklist_sections
  ADD COLUMN IF NOT EXISTS company_slug text REFERENCES public.companies(slug);
UPDATE public.team_task_checklist_sections SET company_slug = 'global' WHERE company_slug IS NULL;
ALTER TABLE public.team_task_checklist_sections ALTER COLUMN company_slug SET DEFAULT 'global';
ALTER TABLE public.team_task_checklist_sections ALTER COLUMN company_slug SET NOT NULL;
CREATE INDEX IF NOT EXISTS team_task_checklist_sections_company_slug_idx
  ON public.team_task_checklist_sections (company_slug, team_task_id);

-- team_task_checklist_items
ALTER TABLE public.team_task_checklist_items
  ADD COLUMN IF NOT EXISTS company_slug text REFERENCES public.companies(slug);
UPDATE public.team_task_checklist_items SET company_slug = 'global' WHERE company_slug IS NULL;
ALTER TABLE public.team_task_checklist_items ALTER COLUMN company_slug SET DEFAULT 'global';
ALTER TABLE public.team_task_checklist_items ALTER COLUMN company_slug SET NOT NULL;
CREATE INDEX IF NOT EXISTS team_task_checklist_items_company_slug_idx
  ON public.team_task_checklist_items (company_slug, team_task_id);

-- team_task_history
ALTER TABLE public.team_task_history
  ADD COLUMN IF NOT EXISTS company_slug text REFERENCES public.companies(slug);
UPDATE public.team_task_history SET company_slug = 'global' WHERE company_slug IS NULL;
ALTER TABLE public.team_task_history ALTER COLUMN company_slug SET DEFAULT 'global';
ALTER TABLE public.team_task_history ALTER COLUMN company_slug SET NOT NULL;
CREATE INDEX IF NOT EXISTS team_task_history_company_slug_idx
  ON public.team_task_history (company_slug, team_task_id, created_at DESC);

-- site_activity_history
ALTER TABLE public.site_activity_history
  ADD COLUMN IF NOT EXISTS company_slug text REFERENCES public.companies(slug);
UPDATE public.site_activity_history SET company_slug = 'global' WHERE company_slug IS NULL;
ALTER TABLE public.site_activity_history ALTER COLUMN company_slug SET DEFAULT 'global';
ALTER TABLE public.site_activity_history ALTER COLUMN company_slug SET NOT NULL;
CREATE INDEX IF NOT EXISTS site_activity_history_company_slug_idx
  ON public.site_activity_history (company_slug, site_id, created_at DESC);

-- site_reminders
ALTER TABLE public.site_reminders
  ADD COLUMN IF NOT EXISTS company_slug text REFERENCES public.companies(slug);
UPDATE public.site_reminders SET company_slug = 'global' WHERE company_slug IS NULL;
ALTER TABLE public.site_reminders ALTER COLUMN company_slug SET DEFAULT 'global';
ALTER TABLE public.site_reminders ALTER COLUMN company_slug SET NOT NULL;
CREATE INDEX IF NOT EXISTS site_reminders_company_slug_idx
  ON public.site_reminders (company_slug, is_completed, reminder_date);

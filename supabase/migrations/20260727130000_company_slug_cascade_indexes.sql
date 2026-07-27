-- Ensure company_slug FKs cascade on delete/update of companies.slug
DO $$
DECLARE
  t text;
  conname text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'columns',
    'cards',
    'card_checklist_items',
    'comments',
    'checklist_categories',
    'checklist_templates',
    'team_tasks',
    'team_task_checklist_sections',
    'team_task_checklist_items',
    'team_task_history',
    'site_activity_history',
    'site_reminders'
  ]
  LOOP
    SELECT c.conname INTO conname
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    WHERE n.nspname = 'public'
      AND rel.relname = t
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid) ILIKE '%company_slug%companies%';

    IF conname IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t, conname);
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I
         ADD CONSTRAINT %I
         FOREIGN KEY (company_slug) REFERENCES public.companies(slug)
         ON UPDATE CASCADE ON DELETE CASCADE',
      t,
      t || '_company_slug_fkey'
    );
  END LOOP;
END $$;

-- Reinforce indexes on heavy tables (idempotent)
CREATE INDEX IF NOT EXISTS columns_company_slug_idx ON public.columns (company_slug, position);
CREATE INDEX IF NOT EXISTS cards_company_slug_idx ON public.cards (company_slug, column_id, position);
CREATE INDEX IF NOT EXISTS card_checklist_items_company_slug_idx ON public.card_checklist_items (company_slug, card_id);
CREATE INDEX IF NOT EXISTS comments_company_slug_idx ON public.comments (company_slug, card_id);
CREATE INDEX IF NOT EXISTS team_tasks_company_slug_idx ON public.team_tasks (company_slug, status, position);
CREATE INDEX IF NOT EXISTS site_reminders_company_slug_idx ON public.site_reminders (company_slug, is_completed, reminder_date);
CREATE INDEX IF NOT EXISTS site_activity_history_company_slug_idx ON public.site_activity_history (company_slug, site_id, created_at DESC);

-- Site reminders linked to cards (sites)
-- cards.id is text (site code), not uuid
CREATE TABLE IF NOT EXISTS public.site_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  reminder_date date NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_reminders_pending_date_idx
  ON public.site_reminders (is_completed, reminder_date);

CREATE INDEX IF NOT EXISTS site_reminders_site_idx
  ON public.site_reminders (site_id);

ALTER TABLE public.site_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to site_reminders"
  ON public.site_reminders FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

GRANT ALL ON public.site_reminders TO anon, authenticated;

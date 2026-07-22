-- Site (card) checklist activity history
-- cards.id is text (site code), not uuid
CREATE TABLE IF NOT EXISTS public.site_activity_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  action_description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_activity_history_site_created_idx
  ON public.site_activity_history (site_id, created_at DESC);

ALTER TABLE public.site_activity_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to site_activity_history"
  ON public.site_activity_history FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

GRANT ALL ON public.site_activity_history TO anon, authenticated;

-- Team task activity history (checklist completion logs)
CREATE TABLE IF NOT EXISTS public.team_task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_task_id uuid NOT NULL REFERENCES public.team_tasks(id) ON DELETE CASCADE,
  action_description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_task_history_task_created_idx
  ON public.team_task_history (team_task_id, created_at DESC);

ALTER TABLE public.team_task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to team_task_history"
  ON public.team_task_history FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

GRANT ALL ON public.team_task_history TO anon, authenticated;

-- Team internal tasks kanban
CREATE TABLE IF NOT EXISTS public.team_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'done')),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_tasks_status_position_idx
  ON public.team_tasks (status, position);

ALTER TABLE public.team_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to team_tasks"
  ON public.team_tasks
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.team_tasks TO anon, authenticated;

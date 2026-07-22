-- Team task checklists: topics/subtopics (sections) + tasks (items)
CREATE TABLE IF NOT EXISTS public.team_task_checklist_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_task_id uuid NOT NULL REFERENCES public.team_tasks(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.team_task_checklist_sections(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_task_checklist_sections_task_idx
  ON public.team_task_checklist_sections (team_task_id, parent_id, sort_order);

CREATE TABLE IF NOT EXISTS public.team_task_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_task_id uuid NOT NULL REFERENCES public.team_tasks(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.team_task_checklist_sections(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  is_completed boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_task_checklist_items_section_idx
  ON public.team_task_checklist_items (section_id, sort_order);

CREATE INDEX IF NOT EXISTS team_task_checklist_items_task_idx
  ON public.team_task_checklist_items (team_task_id);

ALTER TABLE public.team_task_checklist_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_task_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to team_task_checklist_sections"
  ON public.team_task_checklist_sections FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to team_task_checklist_items"
  ON public.team_task_checklist_items FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

GRANT ALL ON public.team_task_checklist_sections TO anon, authenticated;
GRANT ALL ON public.team_task_checklist_items TO anon, authenticated;

-- Site attribute (Poste/Torre/ROOFTOP × próprio/terceiro)
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS attribute text;

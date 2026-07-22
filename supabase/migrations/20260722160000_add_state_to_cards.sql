-- Site state (UF) derived from first 2 letters of title
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS state varchar(2);

UPDATE public.cards
SET state = UPPER(LEFT(COALESCE(NULLIF(TRIM(title), ''), id), 2))
WHERE state IS NULL OR state = '';

-- Sites are stored in public.cards. Optional construction start date.
alter table public.cards
  add column if not exists start_date date null;

comment on column public.cards.start_date is 'Data de início de obra (opcional).';

-- Prezzo e data di vendita delle carte vendute.
alter table public.copie add column if not exists prezzo_vendita numeric(10, 2);
alter table public.copie add column if not exists data_vendita date;

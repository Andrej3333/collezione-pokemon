-- Esempi di pagina salvati dal browser interno con "Invia esempio", per scrivere e sistemare
-- i lettori dei siti. Restano privati: li vede solo il proprietario, che decide se scaricarli
-- e condividerli. Contengono solo la parte della pagina con i dati pubblici.
create table if not exists public.campioni (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  creato timestamptz not null default now(),
  url text not null,
  titolo text,
  html text not null
);
alter table public.campioni enable row level security;
drop policy if exists "solo_proprietario" on public.campioni;
create policy "solo_proprietario" on public.campioni for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, delete on public.campioni to authenticated;

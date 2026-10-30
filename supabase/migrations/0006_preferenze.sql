-- Preferenze dell'app che valgono su tutti i dispositivi (per ora: i siti del browser).
create table if not exists public.preferenze (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  dati jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.preferenze enable row level security;
drop policy if exists "solo_proprietario" on public.preferenze;
create policy "solo_proprietario" on public.preferenze for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.preferenze to authenticated;

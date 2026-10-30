-- Letture fatte dal browser interno sulle pagine dei siti (per ora Cardmarket):
-- i prezzi del riquadro della pagina e le offerte visibili, per lingua e condizione.
create table if not exists public.letture (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  creato timestamptz not null default now(),
  sito text not null,
  url text not null,
  prodotto integer, -- codice del prodotto sul sito (Cardmarket idProduct)
  carta_id text, -- carta del catalogo collegata, se c'è
  lingua text,
  nome text,
  riquadro jsonb not null default '{}'::jsonb, -- da, tendenza, medie, articoli disponibili
  offerte jsonb not null default '[]'::jsonb
);
create index if not exists letture_prodotto_idx on public.letture (user_id, sito, prodotto, creato desc);
create index if not exists letture_carta_idx on public.letture (user_id, carta_id, lingua, creato desc);
alter table public.letture enable row level security;
drop policy if exists "solo_proprietario" on public.letture;
create policy "solo_proprietario" on public.letture for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.letture to authenticated;

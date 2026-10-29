-- Tappa 1: carte possedute, collezioni, posizioni.
-- Ogni riga appartiene a un utente; le regole RLS fanno vedere a ciascuno solo i propri dati.

create table if not exists public.posizioni (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.copie (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- dati della carta, copiati dal catalogo TCGdex al momento dell'aggiunta
  carta_id text not null,            -- id TCGdex, es. g1-RC32
  lingua text not null check (lingua in ('en', 'it', 'ja')),
  nome text not null,
  set_id text not null,
  set_nome text,
  numero text not null,
  rarita text,
  illustratore text,
  immagine text,                     -- indirizzo base TCGdex, senza estensione
  cardmarket_id integer,
  -- dati della copia
  stato text not null default 'collezione' check (stato in ('collezione', 'viaggio', 'venduta')),
  condizione text not null default 'NM',
  gradata boolean not null default false,
  ente text,
  voto text,
  certificato text,
  protezione text,
  posizione_id uuid references public.posizioni(id) on delete set null,
  pagina text,
  prezzo_pagato numeric(10, 2),
  valuta text not null default 'EUR',
  data_arrivo date,
  foto_url text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists copie_user_idx on public.copie (user_id);
create index if not exists copie_set_idx on public.copie (user_id, set_id, lingua);

create table if not exists public.collezioni (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('manuale', 'automatica', 'set')),
  -- automatica: {"lingua": "ja", "gradata": "si"|"no"|null, "pokemon": "testo", "rarita": "testo"}
  regole jsonb not null default '{}'::jsonb,
  -- set: quale set e in che lingua
  set_id text,
  set_nome text,
  lingua text,
  created_at timestamptz not null default now()
);

create table if not exists public.collezione_copie (
  collezione_id uuid not null references public.collezioni(id) on delete cascade,
  copia_id uuid not null references public.copie(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  primary key (collezione_id, copia_id)
);

-- aggiornamento automatico di updated_at
create or replace function public.tocca_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists copie_updated_at on public.copie;
create trigger copie_updated_at before update on public.copie
  for each row execute function public.tocca_updated_at();

-- sicurezza: ognuno vede e modifica solo le proprie righe
alter table public.posizioni enable row level security;
alter table public.copie enable row level security;
alter table public.collezioni enable row level security;
alter table public.collezione_copie enable row level security;

do $$
declare t text;
begin
  foreach t in array array['posizioni', 'copie', 'collezioni', 'collezione_copie'] loop
    execute format('drop policy if exists "solo_proprietario" on public.%I', t);
    execute format(
      'create policy "solo_proprietario" on public.%I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

grant select, insert, update, delete on public.posizioni, public.copie, public.collezioni, public.collezione_copie to authenticated;

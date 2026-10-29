-- Tappa 2: wantlist, ordini, varianti delle carte.

create table if not exists public.ordini (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo text not null default 'europa' check (tipo in ('europa', 'giappone')),
  sito text not null,
  venditore text,
  data date not null default current_date,
  tracciamento text,
  tappa integer not null default 0,
  -- costi dell'ordine oltre al prezzo delle carte, in euro
  spedizione numeric(10, 2) not null default 0,
  commissioni numeric(10, 2) not null default 0,
  -- IVA, dazio e diritti: vuoti = stima dalle regole in voci_importazione
  iva numeric(10, 2),
  dazio numeric(10, 2),
  diritti numeric(10, 2),
  altre_spese numeric(10, 2) not null default 0,
  corriere text,
  iva_al_sito boolean not null default false,
  arrivato boolean not null default false,
  data_arrivo date,
  note text,
  created_at timestamptz not null default now()
);

-- Regole per stimare IVA, dazio e diritti degli ordini extra-UE, modificabili dall'app.
create table if not exists public.voci_importazione (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  categoria text not null check (categoria in ('dazio', 'diritti', 'iva')),
  calcolo text not null check (calcolo in ('fisso', 'percentuale')),
  valore numeric(10, 2) not null default 0,
  base_iva boolean not null default true,
  valore_min numeric(10, 2),
  valore_max numeric(10, 2),
  corriere text,
  dal date,
  al date,
  attiva boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.wantlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  carta_id text not null,
  lingua text not null check (lingua in ('en', 'it', 'ja')),
  nome text not null,
  set_id text not null,
  set_nome text,
  numero text not null,
  immagine text,
  cardmarket_id integer,
  variante text,
  condizione_min text,
  gradata text not null default '' check (gradata in ('', 'si', 'no')),
  prezzo_max numeric(10, 2),
  ordine_id uuid references public.ordini(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.copie add column if not exists variante text;
alter table public.copie add column if not exists ordine_id uuid references public.ordini(id) on delete set null;
alter table public.copie add column if not exists quota_spese numeric(10, 2);

create index if not exists wantlist_user_idx on public.wantlist (user_id);
create index if not exists ordini_user_idx on public.ordini (user_id);
create index if not exists voci_importazione_user_idx on public.voci_importazione (user_id);
create index if not exists copie_ordine_idx on public.copie (ordine_id);

alter table public.ordini enable row level security;
alter table public.wantlist enable row level security;
alter table public.voci_importazione enable row level security;

do $$
declare t text;
begin
  foreach t in array array['ordini', 'wantlist', 'voci_importazione'] loop
    execute format('drop policy if exists "solo_proprietario" on public.%I', t);
    execute format(
      'create policy "solo_proprietario" on public.%I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

grant select, insert, update, delete on public.ordini, public.wantlist, public.voci_importazione to authenticated;

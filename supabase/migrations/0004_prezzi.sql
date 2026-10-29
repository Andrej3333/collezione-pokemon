-- Tappa 3: prezzi giornalieri, cambi, prodotti TCGplayer.
-- Le tabelle dei prezzi sono condivise e in sola lettura per l'app: le scrive solo
-- l'aggiornamento notturno (strumenti/prezzi.py) con la connessione del database.

alter table public.copie add column if not exists tcgplayer_id integer;
alter table public.wantlist add column if not exists tcgplayer_id integer;

-- Un valore al giorno per prodotto e fonte.
-- cardmarket: {"trend", "avg", "low", "avg1", "avg7", "avg30", "trend_holo", ...} in euro
-- tcgplayer: {"Normal": {"market", "low", "mid", "high"}, "Holofoil": {...}} in dollari
create table if not exists public.prezzi (
  data date not null,
  fonte text not null check (fonte in ('cardmarket', 'tcgplayer')),
  prodotto integer not null,
  valori jsonb not null,
  primary key (data, fonte, prodotto)
);
create index if not exists prezzi_prodotto_idx on public.prezzi (fonte, prodotto, data desc);

-- L'ultimo valore disponibile per ogni prodotto.
create or replace view public.prezzi_ultimi with (security_invoker = true) as
  select distinct on (fonte, prodotto) data, fonte, prodotto, valori
  from public.prezzi
  order by fonte, prodotto, data desc;

-- Cambi della Banca centrale europea: quante unità per 1 euro.
create table if not exists public.cambi (
  data date primary key,
  usd numeric(12, 4),
  jpy numeric(12, 4)
);

-- Set e carte di TCGplayer (categoria 3 inglese, 85 giapponese), da TCGCSV.
create table if not exists public.tcgplayer_gruppi (
  id integer primary key,
  categoria integer not null,
  nome text not null,
  sigla text
);

create table if not exists public.tcgplayer_prodotti (
  id integer primary key,
  gruppo integer not null references public.tcgplayer_gruppi(id) on delete cascade,
  nome text not null,
  numero text,
  numero_base text, -- numero senza totale e senza zeri iniziali, per gli abbinamenti
  rarita text
);
create index if not exists tcgplayer_prodotti_numero_idx on public.tcgplayer_prodotti (gruppo, numero_base);
create index if not exists tcgplayer_prodotti_nome_idx on public.tcgplayer_prodotti (lower(nome));

-- Quando sono girati per l'ultima volta gli aggiornamenti automatici.
create table if not exists public.aggiornamenti (
  nome text primary key,
  quando timestamptz not null default now(),
  note text
);

do $$
declare t text;
begin
  foreach t in array array['prezzi', 'cambi', 'tcgplayer_gruppi', 'tcgplayer_prodotti', 'aggiornamenti'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "lettura" on public.%I', t);
    execute format('create policy "lettura" on public.%I for select to authenticated using (true)', t);
    execute format('revoke insert, update, delete on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

grant select on public.prezzi_ultimi to authenticated;

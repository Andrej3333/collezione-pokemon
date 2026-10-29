#!/usr/bin/env bash
# Applica in ordine i file supabase/migrations/*.sql non ancora applicati.
# Richiede la variabile SUPABASE_DB_URL (segreto di GitHub).
set -euo pipefail

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "Manca il segreto SUPABASE_DB_URL: aggiungilo nelle impostazioni del repository." >&2
  exit 1
fi

psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q -c "
  create table if not exists public.migrazioni_applicate (
    nome text primary key,
    applicata_il timestamptz not null default now()
  );
  alter table public.migrazioni_applicate enable row level security;"

for f in $(ls supabase/migrations/*.sql | sort); do
  nome=$(basename "$f")
  gia=$(psql "$SUPABASE_DB_URL" -tA -c "select 1 from public.migrazioni_applicate where nome = '$nome'")
  if [ "$gia" = "1" ]; then
    echo "gia applicata: $nome"
    continue
  fi
  echo "applico: $nome"
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q --single-transaction \
    -f "$f" \
    -c "insert into public.migrazioni_applicate (nome) values ('$nome')"
done
echo "database aggiornato"

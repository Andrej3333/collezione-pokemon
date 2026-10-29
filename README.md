# collezione-pokemon

App personale per gestire una collezione di carte Pokémon: collezioni, wantlist, ordini in viaggio, prezzi aggiornati ogni giorno e ricerca sui siti (Cardmarket, siti giapponesi e altri) tramite un browser interno.

## Stato

Tappa 1: base e catalogo. Prima versione web su GitHub Pages: https://andrej3333.github.io/collezione-pokemon/

## Struttura

- `app/`: l'app (React e TypeScript). Si pubblica da sola a ogni modifica e ogni lunedi.
- `strumenti/catalogo.py`: genera il catalogo leggero delle carte da TCGdex (inglese, italiano, giapponese).
- `supabase/migrations/`: il database. Le migrazioni si applicano da sole con il segreto `SUPABASE_DB_URL`.
- `strumenti/verifica_fonti.py` e `verifiche/`: verifica giornaliera delle fonti dati.
- `docs/piano.md`: piano e decisioni.

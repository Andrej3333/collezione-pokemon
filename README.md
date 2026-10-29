# collezione-pokemon

App personale per gestire una collezione di carte Pokémon: collezioni, wantlist, ordini in viaggio, prezzi aggiornati ogni giorno e ricerca sui siti (Cardmarket, siti giapponesi e altri) tramite un browser interno.

## Stato

Tappa 0, preparazione: verifica delle fonti dati.

- `strumenti/verifica_fonti.py`: controlla TCGdex, i file di Cardmarket, pokemontcg.io e i cambi BCE.
- `.github/workflows/verifica-fonti.yml`: esegue la verifica sui server di GitHub, ogni giorno e a ogni modifica dello script.
- `verifiche/resoconto.md`: l'ultimo resoconto.
- `verifiche/esecuzioni.md`: lo storico delle esecuzioni, per vedere se il lavoro programmato parte davvero.

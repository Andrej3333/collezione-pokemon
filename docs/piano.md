# Piano e decisioni

Documento di riferimento del progetto. Si aggiorna quando una decisione viene presa o cambiata.

Prototipo grafico approvato: https://claude.ai/artifact/XBvuKQit6n6HXDAUfXGcpx

## Obiettivo

App personale per il collezionismo (non per il commercio) di carte Pokémon, su Android e Windows, con un unico database condiviso. Funziona in autonomia, senza assistenza esterna.

## Decisioni sull'interfaccia

- Tema scuro.
- Menu fisso in basso con quattro voci: Collezioni, Wantlist, In viaggio, Browser. Impostazioni dall'ingranaggio in alto.
- Ottimizzata per il telefono; su computer le stesse schermate, più larghe.
- Niente totali economici (valore della collezione, spesa complessiva). Valore e andamento restano sulla singola carta.
- Immagine della carta visibile ovunque compaia una carta.
- Collezioni multiple: scelte a mano, automatiche (con regole), set da completare. Una carta può stare in più collezioni. La posizione fisica è un dato separato.
- Dalla wantlist, toccando una carta parte la ricerca automatica sui siti scelti. Dalla scheda di una carta posseduta, la stessa ricerca serve a valutarla.

## Decisioni sui dati

- Catalogo: TCGdex (nomi, set, numeri, immagini, collegamento al prodotto Cardmarket).
- Prezzi automatici ogni giorno: file pubblici di Cardmarket (un prezzo per prodotto; le carte giapponesi sono prodotti separati) e TCGplayer tramite TCGCSV (anche la categoria giapponese, Vending comprese). Cambi dalla BCE.
- Valore principale di una carta: tendenza Cardmarket; per prima edizione e Shadowless, che Cardmarket non separa, il prezzo di mercato TCGplayer convertito in euro. Sotto ogni miniatura, con freccia (media 7 giorni rispetto a 30). Nessun totale.
- Storico: salvato ogni notte nel database solo per le carte seguite (collezione, in viaggio, wantlist); i grafici partono dal primo giorno.
- Carte giapponesi su TCGplayer: abbinate da sole per set e numero; se ci sono più candidati si sceglie nella scheda.
- Mercato interno giapponese (Pokecazilla) e PriceCharting: letture dal browser interno, tappa 4.
- Prezzi per lingua, condizione, gradate e aste: dalle letture fatte nel browser interno quando cerchi o apri una carta.
- Nessun accesso automatico in background ai siti (niente scraping): l'app legge solo le pagine che apre l'utente.
- Immagini, catena di fonti: TCGdex, Limitless, database ufficiale giapponese, TCGplayer, TCG Collector, foto dell'utente.
- Bulbapedia: blocca gli accessi automatici, quindi non viene interrogata in automatico. Nella scheda carta c'è una piccola icona che apre il browser interno direttamente sulla pagina Bulbapedia della carta; l'app riconosce le immagini nella pagina e le salva da sola (le incerte vanno in "da confermare"). Alta risoluzione solo per carte in collezione e wantlist, una alla volta.
- Ordini: spese divise sulle carte in proporzione al prezzo, sempre visibili sia l'ordine intero sia il costo effettivo di ogni carta.
- Tasse di importazione (ordini dal Giappone): dazio, diritti e IVA stimati con regole modificabili in Impostazioni (importo fisso o percentuale, soglie di valore, date di validità, corriere). Vale la regola in vigore alla data di arrivo. Le stime restano segnate finché l'utente non inserisce la cifra vera.
- Ordini e costi letti in automatico dalle pagine "I miei acquisti" dei siti (Cardmarket, eBay, proxy) tramite il browser interno, nella tappa 4: le API ufficiali sono chiuse o limitate.
- Scale di condizione: ogni sito mostra la sua voce originale, con un'equivalenza indicativa (modificabile) nella scala Cardmarket.

## Tappe

0. Preparazione: account, verifica delle fonti (in corso, vedi `verifiche/resoconto.md`).
1. Base e catalogo: database, accesso, catalogo con immagini, collezioni, scheda carta senza prezzi. Prima versione web.
2. Wantlist e ordini, stati delle carte, tappe di consegna.
3. Prezzi automatici, storico, grafici.
4. App Android e Windows, browser interno, lettore Cardmarket, icona Bulbapedia con salvataggio automatico delle immagini.
5. Ricerca su più siti e scale di condizione; poi un sito alla volta, ognuno discusso prima.

## Metodo di lavoro

Ogni passo viene spiegato e approvato prima di essere costruito; i cambi grandi di interfaccia passano prima dal prototipo.

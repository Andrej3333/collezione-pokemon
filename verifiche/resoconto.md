# Resoconto verifica fonti

Eseguito: 2026-10-29 15:49 UTC, avvio: push

## 1. TCGdex (catalogo e immagini)

- **inglese**: 220 set, 23736 carte, 21987 con immagine (93%)
- **italiano**: 193 set, 15741 carte, 14580 con immagine (93%)
- **giapponese**: 184 set, 12781 carte, 3882 con immagine (30%)
  - ultimi 15 set giapponesi: 新たなる試練の向こう (SM2p); ひかる伝説 (SM3p); サン＆ムーン (SM1p); ウルトラフォース (SM5p); GXバトルブースト (SM4p); メガブレイブ (M1L); MEGAドリームex (M2a); ムニキスゼロ (M3); ストームエメラルダ (M6); アビスアイ (M5); スタートデッキ100 バトルコレクション (MC); メガ プロモカード (M-P); インフェルノX (M2); メガシンフォニア (M1S); ニンジャスピナー (M4)
  - set che sembrano Vending o espansioni a fogli: nessuno trovato per nome

- carta **swsh3-136** (Furret): campi = category, id, illustrator, image, localId, name, rarity, set, variants, variants_detailed, dexId, hp, types, evolveFrom, description, stage, attacks, weaknesses, retreat, regulationMark, legal, updated, pricing
  - `pricing` presente, sotto-campi: cardmarket, tcgplayer
  - `pricing.cardmarket`: {"updated": "2026-10-28T22:54:32.784Z", "unit": "EUR", "idProduct": 483559, "avg": 0.06, "low": 0.02, "trend": 0.04, "avg1": 0.02, "avg7": 0.05, "avg30": 0.06, "avg-holo": 0.22, "low-holo": 0.08, "trend-holo": 0.23, "avg1-holo": 0.18, "avg7-holo": 0.23, "avg30-holo": 0.24}
  - `pricing.tcgplayer`: {"unit": "USD", "updated": "2026-10-14T22:55:05.165Z", "normal": {"productId": 219333, "lowPrice": 0.02, "midPrice": 0.25, "highPrice": 25.27, "marketPrice": 0.27, "directLowPrice": null}, "reverse-holofoil": {"productId": 219333, "lowPrice": 0.17, "midPrice": 0.43, "highPrice": 19.8, "marketPrice": 0.44, "directLowPrice": 0.37}}
- carta **g1-RC32** (Sylveon EX): campi = category, id, illustrator, image, localId, name, rarity, set, variants, variants_detailed, dexId, cameoDexIds, hp, types, suffix, attacks, weaknesses, resistances, retreat, legal, updated, thirdParty, pricing
  - `pricing` presente, sotto-campi: cardmarket, tcgplayer
  - `pricing.cardmarket`: {"updated": "2026-10-28T22:54:32.776Z", "unit": "EUR", "idProduct": 288530, "avg": 42.46, "low": 19.88, "trend": 36.75, "avg1": 45, "avg7": 41.19, "avg30": 42.85, "avg-holo": null, "low-holo": null, "trend-holo": 7.07, "avg1-holo": 3.99, "avg7-holo": 7.23, "avg30-holo": 7.12}
  - `pricing.tcgplayer`: null

## 2. Cardmarket (file pubblici)

- **prezzi**: scaricato, 15.8 MB
  - campi principali: version, createdAt, priceGuides
  - createdAt: 2026-10-29T02:52:59+0100
  - version: 1
  - `priceGuides`: 80170 elementi
  - esempio di elemento: `{"idProduct": 271439, "idCategory": 52, "avg": 174.5, "low": 150, "trend": 270.03, "avg1": null, "avg7": null, "avg30": null, "avg-holo": null, "low-holo": null, "trend-holo": 3.93, "avg1-holo": null, "avg7-holo": null, "avg30-holo": null}`
- **prodotti singole**: scaricato, 13.8 MB
  - campi principali: version, createdAt, products
  - createdAt: 2026-10-29T14:18:13+0100
  - version: 1
  - `products`: 75066 elementi
  - esempio di elemento: `{"idProduct": 273532, "name": "Weedle [Multiply]", "idCategory": 51, "categoryName": "Pokémon Single", "idExpansion": 1585, "idMetacard": 340471, "dateAdded": "0000-00-00 00:00:00"}`
- **prodotti sigillati**: scaricato, 955 KB
  - campi principali: version, createdAt, products
  - createdAt: 2026-10-29T14:18:15+0100
  - version: 1
  - `products`: 5105 elementi
  - esempio di elemento: `{"idProduct": 271439, "name": "Phantom Forces Booster", "idCategory": 52, "categoryName": "Pokémon Booster", "idExpansion": 1521, "idMetacard": 0, "dateAdded": "2007-01-01 00:00:00"}`

## 3. pokemontcg.io (prezzi TCGplayer e Cardmarket)

- `tcgplayer`: aggiornato 2026/10/15, prezzi: {"normal": {"low": 0.02, "mid": 0.25, "high": 25.27, "market": 0.27, "directLow": null}, "reverseHolofoil": {"low": 0.17, "mid": 0.43, "high": 19.8, "market": 0.44, "directLow": 0.37}}
- `cardmarket`: aggiornato 2025/11/21, prezzi: {"averageSellPrice": 0.11, "lowPrice": 0.02, "trendPrice": 0.11, "germanProLow": 0.0, "suggestedPrice": 0.0, "reverseHoloSell": 0.27, "reverseHoloLow": 0.03, "reverseHoloTrend": 0.23, "lowPriceExPlus": 0.02, "avg1": 0.03, "avg7": 0.07, "avg30": 0.1, "reverseHoloAvg1": 0.25, "reverseHoloAvg7": 0.17, 

## 4. Cambi della Banca centrale europea

- JPY: currency='JPY' rate='175.92'/>
			<Cube 
- USD: currency='USD' rate='1.1130'/>
			<Cube 


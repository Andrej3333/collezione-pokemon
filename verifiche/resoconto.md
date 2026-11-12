# Resoconto verifica fonti

Eseguito: 2026-11-12 13:45 UTC, avvio: schedule

## 1. TCGdex (catalogo e immagini)

- **inglese**: 221 set, 23912 carte, 21990 con immagine (92%)
- **italiano**: 194 set, 15867 carte, 14567 con immagine (92%)
- **giapponese**: 204 set, 13156 carte, 3882 con immagine (30%)
  - ultimi 15 set giapponesi: 変幻の仮面 (SV6); スカーレット&バイオレット プロモカード (SV-P); スターターセット テラスタイプ：ステラ ニンフィアex (SVLN); 30th CELEBRATION (M6a); メガ プロモカード (M-P); アビスアイ (M5); ストームエメラルダ (M6); ニンジャスピナー (M4); スタートデッキ100 バトルコレクション (MC); MEGAドリームex (M2a); メガシンフォニア (M1S); ムニキスゼロ (M3); 30th CELEBRATION プレミアムデッキセット エーフィ・ブラッキー (MF); メガブレイブ (M1L); インフェルノX (M2)
  - set che sembrano Vending o espansioni a fogli: nessuno trovato per nome

- carta **swsh3-136** (Furret): campi = category, id, illustrator, image, localId, name, rarity, set, variants, variants_detailed, dexId, hp, types, evolveFrom, description, stage, attacks, weaknesses, retreat, regulationMark, legal, updated, pricing
  - `pricing` presente, sotto-campi: cardmarket, tcgplayer
  - `pricing.cardmarket`: {"updated": "2026-11-11T23:49:36.436Z", "unit": "EUR", "idProduct": 483559, "avg": 0.06, "low": 0.02, "trend": 0.09, "avg1": 0.06, "avg7": 0.08, "avg30": 0.06, "avg-holo": 0.22, "low-holo": 0.08, "trend-holo": 0.29, "avg1-holo": 0.25, "avg7-holo": 0.4, "avg30-holo": 0.29}
  - `pricing.tcgplayer`: {"unit": "USD", "updated": "2026-11-11T23:49:48.714Z", "normal": {"productId": 219333, "lowPrice": 0.02, "midPrice": 0.27, "highPrice": 25.29, "marketPrice": 0.27, "directLowPrice": 0.05}, "reverse-holofoil": {"productId": 219333, "lowPrice": 0.17, "midPrice": 0.43, "highPrice": 19.66, "marketPrice": 0.43, "directLowPrice": 0.25}}
- carta **g1-RC32** (Sylveon EX): campi = category, id, illustrator, image, localId, name, rarity, set, variants, variants_detailed, dexId, cameoDexIds, hp, types, suffix, attacks, weaknesses, resistances, retreat, legal, updated, thirdParty, pricing
  - `pricing` presente, sotto-campi: cardmarket, tcgplayer
  - `pricing.cardmarket`: {"updated": "2026-11-11T23:49:36.431Z", "unit": "EUR", "idProduct": 288530, "avg": 41.6, "low": 15, "trend": 43.45, "avg1": 50, "avg7": 44.08, "avg30": 41.13, "avg-holo": null, "low-holo": null, "trend-holo": 7.07, "avg1-holo": 3.99, "avg7-holo": 7.23, "avg30-holo": 7.12}
  - `pricing.tcgplayer`: null

## 2. Cardmarket (file pubblici)

- **prezzi**: scaricato, 15.9 MB
  - campi principali: version, createdAt, priceGuides
  - createdAt: 2026-11-12T02:51:19+0100
  - version: 1
  - `priceGuides`: 80805 elementi
  - esempio di elemento: `{"idProduct": 271439, "idCategory": 52, "avg": 153.5, "low": 150, "trend": 214.91, "avg1": null, "avg7": null, "avg30": null, "avg-holo": null, "low-holo": null, "trend-holo": 3.93, "avg1-holo": null, "avg7-holo": null, "avg30-holo": null}`
- **prodotti singole**: scaricato, 13.9 MB
  - campi principali: version, createdAt, products
  - createdAt: 2026-11-11T13:50:33+0100
  - version: 1
  - `products`: 75695 elementi
  - esempio di elemento: `{"idProduct": 273532, "name": "Weedle [Multiply]", "idCategory": 51, "categoryName": "Pokémon Single", "idExpansion": 1585, "idMetacard": 340471, "dateAdded": "0000-00-00 00:00:00"}`
- **prodotti sigillati**: scaricato, 956 KB
  - campi principali: version, createdAt, products
  - createdAt: 2026-11-11T13:50:35+0100
  - version: 1
  - `products`: 5111 elementi
  - esempio di elemento: `{"idProduct": 271439, "name": "Phantom Forces Booster", "idCategory": 52, "categoryName": "Pokémon Booster", "idExpansion": 1521, "idMetacard": 0, "dateAdded": "2007-01-01 00:00:00"}`

## 3. pokemontcg.io (prezzi TCGplayer e Cardmarket)

- non raggiungibile (stato 500, HTTP Error 500: Internal Server Error)

## 4. Cambi della Banca centrale europea

- JPY: currency='JPY' rate='177.18'/>
			<Cube 
- USD: currency='USD' rate='1.1127'/>
			<Cube 

## 5. Carte giapponesi: immagini e prodotti Cardmarket

- set con tutte le immagini: 30, set senza immagini: 88, set parziali: 3
  - con tutte: S10P, S10a, S11, S11a, S12, S9, S9a, SV1S, SV1V, SV1a, SV2D, SV2P, SV2a, SV3, SV3a, SV4K, SV4M, SV4a, SV5K, SV5a, SV6, SV6a, SV7, SV7a, SV8a, SV9, SV9a, SVK, SVLN, SVLS
  - senza: BW8a, CP1, CP2, E1, E2, E3, E4, E5, M-P, M1L, M1S, M2, M2a, M3, M4, M5, M6, M6a, MC, MF, PCG1, PCG2, PCG3, PCG4, PCG5, PCG6, PCG7, PCG8, PCG9, PMCG1, PMCG2, PMCG3, PMCG4, PMCG5, PMCG6, S5I, S5R, S6H, S6K, S7D, S8, S8b, SM10, SM10a, SM10b, SM11, SM11a, SM11b, SM12, SM12a, SM1M, SM1S, SM1p, SM2K, SM2L, SM2p, SM3H, SM3N, SM3p, SM4A, SM4S, SM4p, SM5M, SM5S, SM5p, SM6, SM6a, SM6b, SM7, SM7a, SM7b, SM8, SM8a, SM8b, SM9, SM9a, SM9b, SV-P, SV11B, SV11W
  - parziali: S12a (254/258), SV10 (98/132), SV8 (106/138)
- carta giapponese **SV2a-210** (基本超エネルギー): immagine si, prodotto Cardmarket 719663, tendenza 12.26
- carta giapponese **SV4a-360** (コライドンex): immagine si, prodotto Cardmarket 747714, tendenza 5.04
- carta giapponese **M2a-250** (メガカイリューex): immagine no, prodotto Cardmarket 861493, tendenza 130.5
- carta giapponese **S12a-262** (アルセウスVSTAR): immagine si, prodotto Cardmarket 687824, tendenza 150.29
- carta giapponese **SM12a-226** (ファイヤー&サンダー&フリーザーGX): immagine no, prodotto Cardmarket 547221, tendenza 275.33

### Prodotti Cardmarket delle carte giapponesi

- SV2a-210 -> prodotto 719663: {"idProduct": 719663, "name": "Basic Psychic Energy", "idCategory": 51, "categoryName": "Pokémon Single", "idExpansion": 5328, "idMetacard": 439732, "dateAdded": "2023-06-20 17:25:01"}
- SV4a-360 -> prodotto 747714: {"idProduct": 747714, "name": "Koraidon ex [Dino Cry | Wild Impact]", "idCategory": 51, "categoryName": "Pokémon Single", "idExpansion": 5519, "idMetacard": 415183, "dateAdded": "2023-12-01 09:07:44"}
- M2a-250 -> prodotto 861493: {"idProduct": 861493, "name": "Mega Dragonite ex [Sky Transport | Ryuno Glide]", "idCategory": 51, "categoryName": "Pokémon Single", "idExpansion": 6380, "idMetacard": 456956, "dateAdded": "2025-11-27 19:13:23"}
- S12a-262 -> prodotto 687824: {"idProduct": 687824, "name": "Arceus VSTAR [Trinity Nova | Starbirth]", "idCategory": 51, "categoryName": "Pokémon Single", "idExpansion": 5198, "idMetacard": 401489, "dateAdded": "2022-12-02 00:51:01"}
- SM12a-226 -> prodotto 547221: {"idProduct": 547221, "name": "Moltres & Zapdos & Articuno GX [Trinity Burn | Sky Legends GX]", "idCategory": 51, "categoryName": "Pokémon Single", "idExpansion": 3776, "idMetacard": 274473, "dateAdded": "2021-03-04 10:16:10"}
- confronto: inglese sv03.5-199 (Charizard ex) -> prodotto 733794: {"idProduct": 733794, "name": "Charizard ex [Brave Wing | Explosive Vortex]", "idCategory": 51, "categoryName": "Pokémon Single", "idExpansion": 5402, "idMetacard": 421085, "dateAdded": "2023-09-22 05:57:24"}

## 6. TCGCSV (dati TCGplayer scaricabili)

- ultimo aggiornamento: 2026-11-11T20:05:27+0000
- categoria 3: Pokemon
- categoria 85: Pokemon Japan
  - set giapponesi su TCGplayer: 461, ultimi: Pokemon Card Fan Club; Pokemon Card Information Promotional cards; Unnumbered Promotional cards; Unnumbered World Championships; Vending Machine cards Series 1 (Blue); Vending Machine cards Series 2 (Red); Vending Machine cards Series 3 (Green); World Hobby Fair
  - prezzi del set 24200: 3 righe, esempio `{"productId": 617299, "lowPrice": 124.99, "midPrice": 189.99, "highPrice": 399.99, "marketPrice": 243.55, "directLowPrice": null, "subTypeName": "Normal"}`

## 7. Fonti di immagini per le carte giapponesi

- Bulbagarden Archives, ricerca "Vending": non raggiungibile (stato 403, HTTP Error 403: Forbidden)
- Bulbagarden Archives, ricerca "Expansion Sheet": non raggiungibile (stato 403, HTTP Error 403: Forbidden)
- Bulbagarden Archives, ricerca "Mew ex 151": non raggiungibile (stato 403, HTTP Error 403: Forbidden)
- Bulbapedia, ricerca "Vending series": non raggiungibile (stato 403, HTTP Error 403: Forbidden)
- database ufficiale giapponese: risposta 200, 10 KB; inizio: `{
    "result": 1,
    "errMsg": "",
    "thisPage": 1,
    "maxPage": 604,
    "hitCnt": 23530,
    "cardStart": 1,
    "cardEnd": 39,
    "searchCondition": [
        "レギュレーション：すべてのカード"
    ],
    "regulation": "all",
    "cardList": [
        {
  `
- Limitless, carta SV2a 201: risposta 200, immagini trovate: https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpc/SV2a/SV2a_201_R_JP_LG.png; https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpc/SV2a/SV2a_201_R_JP.png; https://s3.limitlesstcg.com/sets/jp/SV2a.png
- TCG Collector, espansioni giapponesi: risposta 200, 1.9 MB, citazioni di "Vending": 38


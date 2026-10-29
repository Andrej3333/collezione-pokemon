"""Verifica delle fonti dati per l'app collezione Pokemon.

Gira sui server di GitHub (GitHub Actions). Controlla:
  1. TCGdex: set e carte in inglese, italiano e giapponese, presenza delle immagini,
     dati di prezzo e collegamento ai prodotti Cardmarket.
  2. Cardmarket: file pubblici di prodotti e prezzi.
  3. pokemontcg.io: prezzi TCGplayer e Cardmarket.
  4. Banca centrale europea: cambi del giorno (yen e dollaro).
  5. Carte giapponesi: immagini per set su TCGdex e prodotti Cardmarket collegati.
  6. TCGCSV: dati TCGplayer scaricabili, anche per le carte giapponesi.
  7. Fonti di immagini: Bulbapedia, database ufficiale giapponese, Limitless, TCG Collector.

Scrive il resoconto in verifiche/resoconto.md e aggiunge una riga a
verifiche/esecuzioni.md, cosi si vede anche se i lavori programmati partono.
Usa solo la libreria standard di Python.
"""

import datetime as dt
import gzip
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request

UA = "collezione-pokemon-verifica/1.0 (uso personale)"
OUT_DIR = "verifiche"
LINES = []


def log(text=""):
    LINES.append(text)
    print(text)


def fetch(url, timeout=60):
    """Ritorna (stato, bytes, errore)."""
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Encoding": "gzip"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = r.read()
            if r.headers.get("Content-Encoding") == "gzip":
                data = gzip.decompress(data)
            return r.status, data, None
    except urllib.error.HTTPError as e:
        return e.code, b"", str(e)
    except Exception as e:  # rete, timeout, DNS
        return None, b"", repr(e)


def fetch_json(url, timeout=60):
    status, data, err = fetch(url, timeout)
    if err or not data:
        return status, None, err or "risposta vuota"
    try:
        return status, json.loads(data.decode("utf-8")), None
    except Exception as e:
        return status, None, "non e JSON: " + repr(e)


def size(n):
    return "%.1f MB" % (n / 1e6) if n > 1e6 else "%.0f KB" % (n / 1e3)


def keys_of(obj, limit=25):
    if isinstance(obj, dict):
        return ", ".join(list(obj.keys())[:limit])
    return type(obj).__name__


# 1. TCGdex -----------------------------------------------------------------

def check_tcgdex():
    log("## 1. TCGdex (catalogo e immagini)")
    log()
    base = "https://api.tcgdex.net/v2"
    for lang, label in [("en", "inglese"), ("it", "italiano"), ("ja", "giapponese")]:
        st, sets, err = fetch_json("%s/%s/sets" % (base, lang))
        if err:
            log("- **%s**: set non raggiungibili (stato %s, %s)" % (label, st, err))
            continue
        st, cards, err = fetch_json("%s/%s/cards" % (base, lang), timeout=120)
        if err:
            log("- **%s**: %d set, elenco carte non raggiungibile (%s)" % (label, len(sets), err))
            continue
        with_img = sum(1 for c in cards if c.get("image"))
        pct = 100.0 * with_img / len(cards) if cards else 0
        log("- **%s**: %d set, %d carte, %d con immagine (%.0f%%)" % (label, len(sets), len(cards), with_img, pct))
        if lang == "ja":
            log("  - ultimi 15 set giapponesi: " + "; ".join(
                "%s (%s)" % (s.get("name"), s.get("id")) for s in sets[-15:]))
            hits = [s for s in sets if any(k in (s.get("name") or "") for k in ("自販機", "拡張シート", "Vending"))]
            log("  - set che sembrano Vending o espansioni a fogli: %s" % (
                "; ".join("%s (%s)" % (s.get("name"), s.get("id")) for s in hits) or "nessuno trovato per nome"))
    log()

    # Dettaglio di una carta inglese: prezzi e legami
    for cid in ["swsh3-136", "g1-RC32"]:
        st, card, err = fetch_json("%s/en/cards/%s" % (base, cid))
        if err:
            log("- carta %s: non raggiungibile (stato %s, %s)" % (cid, st, err))
            continue
        log("- carta **%s** (%s): campi = %s" % (cid, card.get("name"), keys_of(card, 40)))
        pricing = card.get("pricing")
        if pricing:
            log("  - `pricing` presente, sotto-campi: %s" % keys_of(pricing))
            for k, v in pricing.items():
                log("  - `pricing.%s`: %s" % (k, json.dumps(v, ensure_ascii=False)[:400]))
        else:
            log("  - nessun campo `pricing`")
    log()


# 2. Cardmarket -------------------------------------------------------------

def check_cardmarket():
    log("## 2. Cardmarket (file pubblici)")
    log()
    base = "https://downloads.s3.cardmarket.com/productCatalog"
    # 6 e l'identificativo del gioco Pokemon su Cardmarket (da confermare)
    candidates = [
        ("prezzi", base + "/priceGuide/price_guide_6.json"),
        ("prodotti singole", base + "/productList/products_singles_6.json"),
        ("prodotti sigillati", base + "/productList/products_nonsingles_6.json"),
    ]
    for label, url in candidates:
        st, data, err = fetch(url, timeout=180)
        if err:
            log("- **%s**: non scaricato (stato %s, %s)" % (label, st, err))
            log("  - indirizzo provato: `%s`" % url)
            continue
        log("- **%s**: scaricato, %s" % (label, size(len(data))))
        try:
            obj = json.loads(data.decode("utf-8"))
        except Exception as e:
            log("  - non e JSON: %r" % e)
            continue
        log("  - campi principali: %s" % keys_of(obj))
        for k in ("createdAt", "version"):
            if isinstance(obj, dict) and k in obj:
                log("  - %s: %s" % (k, obj[k]))
        lists = [(k, v) for k, v in obj.items() if isinstance(v, list)] if isinstance(obj, dict) else []
        for k, v in lists:
            log("  - `%s`: %d elementi" % (k, len(v)))
            if v:
                log("  - esempio di elemento: `%s`" % json.dumps(v[0], ensure_ascii=False)[:500])
    log()


# 3. pokemontcg.io ----------------------------------------------------------

def check_pokemontcg():
    log("## 3. pokemontcg.io (prezzi TCGplayer e Cardmarket)")
    log()
    st, obj, err = fetch_json("https://api.pokemontcg.io/v2/cards/swsh3-136")
    if err:
        log("- non raggiungibile (stato %s, %s)" % (st, err))
        log()
        return
    card = obj.get("data", {})
    for k in ("tcgplayer", "cardmarket"):
        v = card.get(k)
        if v:
            log("- `%s`: aggiornato %s, prezzi: %s" % (k, v.get("updatedAt"), json.dumps(v.get("prices"), ensure_ascii=False)[:300]))
        else:
            log("- `%s`: assente" % k)
    log()


# 4. Cambi BCE ---------------------------------------------------------------

def check_ecb():
    log("## 4. Cambi della Banca centrale europea")
    log()
    st, data, err = fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml")
    if err:
        log("- non raggiungibile (stato %s, %s)" % (st, err))
    else:
        text = data.decode("utf-8", "replace")
        for cur in ("JPY", "USD"):
            i = text.find("currency='%s'" % cur)
            log("- %s: %s" % (cur, text[i:i + 40] if i >= 0 else "non trovato"))
    log()


# 5. Carte giapponesi: copertura immagini per set e prodotti Cardmarket ------

def pause():
    time.sleep(1.5)


def check_japanese():
    log("## 5. Carte giapponesi: immagini e prodotti Cardmarket")
    log()
    base = "https://api.tcgdex.net/v2/ja"
    st, cards, err = fetch_json(base + "/cards", timeout=120)
    if err:
        log("- elenco carte giapponesi non raggiungibile (%s)" % err)
        log()
        return None
    by_set = {}
    for c in cards:
        sid = c.get("id", "").rsplit("-", 1)[0]
        tot, img = by_set.get(sid, (0, 0))
        by_set[sid] = (tot + 1, img + (1 if c.get("image") else 0))
    full = [s for s, (t, i) in by_set.items() if i == t]
    none = [s for s, (t, i) in by_set.items() if i == 0]
    part = [s for s, (t, i) in by_set.items() if 0 < i < t]
    log("- set con tutte le immagini: %d, set senza immagini: %d, set parziali: %d" % (len(full), len(none), len(part)))
    log("  - con tutte: %s" % ", ".join(sorted(full)[:60]))
    log("  - senza: %s" % ", ".join(sorted(none)[:80]))
    log("  - parziali: %s" % ", ".join("%s (%d/%d)" % (s, by_set[s][1], by_set[s][0]) for s in sorted(part)[:40]))

    # alcune carte giapponesi: prezzo e prodotto Cardmarket
    samples = []
    for sid in ["SV2a", "SV4a", "M2a", "S12a", "SM12a"]:
        ids = [c["id"] for c in cards if c.get("id", "").startswith(sid + "-")]
        if ids:
            samples.append(ids[-1])
    found = []
    for cid in samples:
        st, card, err = fetch_json("%s/cards/%s" % (base, cid))
        if err:
            log("- carta %s: non raggiungibile (%s)" % (cid, err))
            continue
        cm = (card.get("pricing") or {}).get("cardmarket") or {}
        log("- carta giapponese **%s** (%s): immagine %s, prodotto Cardmarket %s, tendenza %s" % (
            cid, card.get("name"), "si" if card.get("image") else "no", cm.get("idProduct"), cm.get("trend")))
        if cm.get("idProduct"):
            found.append((cid, cm.get("idProduct")))
    log()
    return found


def check_cardmarket_products(found):
    """Controlla nei file Cardmarket i prodotti collegati alle carte giapponesi."""
    if not found:
        return
    log("### Prodotti Cardmarket delle carte giapponesi")
    log()
    st, prods, err = fetch_json("https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_6.json", timeout=180)
    if err:
        log("- elenco prodotti non raggiungibile (%s)" % err)
        return
    index = {p["idProduct"]: p for p in prods.get("products", [])}
    for cid, pid in found:
        p = index.get(pid)
        log("- %s -> prodotto %s: %s" % (cid, pid, json.dumps(p, ensure_ascii=False) if p else "non presente nell'elenco"))
    # confronto con la versione inglese di 151: stesso prodotto o prodotto separato?
    st, en, err = fetch_json("https://api.tcgdex.net/v2/en/cards/sv03.5-199")
    if not err:
        cm = (en.get("pricing") or {}).get("cardmarket") or {}
        p = index.get(cm.get("idProduct"))
        log("- confronto: inglese sv03.5-199 (%s) -> prodotto %s: %s" % (
            en.get("name"), cm.get("idProduct"), json.dumps(p, ensure_ascii=False) if p else "non trovato"))
    log()


# 6. Altre fonti di prezzo: TCGCSV --------------------------------------------

def check_tcgcsv():
    log("## 6. TCGCSV (dati TCGplayer scaricabili)")
    log()
    st, data, err = fetch("https://tcgcsv.com/last-updated.txt")
    log("- ultimo aggiornamento: %s" % (data.decode("utf-8", "replace").strip()[:60] if not err else "non raggiungibile (%s)" % err))
    pause()
    st, cats, err = fetch_json("https://tcgcsv.com/tcgplayer/categories")
    if err:
        log("- categorie non raggiungibili (stato %s, %s)" % (st, err))
        log()
        return
    rows = cats.get("results", cats) if isinstance(cats, dict) else cats
    poke = [c for c in rows if "pok" in (c.get("name", "") + c.get("displayName", "")).lower()]
    for c in poke:
        log("- categoria %s: %s" % (c.get("categoryId"), c.get("displayName") or c.get("name")))
    for c in poke:
        if "japan" in (c.get("name", "") + c.get("displayName", "")).lower():
            pause()
            st, groups, err = fetch_json("https://tcgcsv.com/tcgplayer/%s/groups" % c["categoryId"])
            if err:
                log("  - gruppi non raggiungibili (%s)" % err)
                continue
            g = groups.get("results", groups) if isinstance(groups, dict) else groups
            log("  - set giapponesi su TCGplayer: %d, ultimi: %s" % (len(g), "; ".join(x.get("name", "") for x in g[-8:])))
            if g:
                pause()
                gid = g[-1]["groupId"]
                st, prices, err = fetch_json("https://tcgcsv.com/tcgplayer/%s/%s/prices" % (c["categoryId"], gid))
                if not err:
                    pr = prices.get("results", prices) if isinstance(prices, dict) else prices
                    log("  - prezzi del set %s: %d righe, esempio `%s`" % (gid, len(pr), json.dumps(pr[0], ensure_ascii=False)[:300] if pr else ""))
    log()


# 7. Fonti di immagini -------------------------------------------------------

def check_images():
    log("## 7. Fonti di immagini per le carte giapponesi")
    log()
    # Bulbagarden Archives (immagini di Bulbapedia), API MediaWiki pubblica
    for q in ["Vending", "Expansion Sheet", "Mew ex 151"]:
        url = ("https://archives.bulbagarden.net/w/api.php?action=query&list=search&srnamespace=6&srlimit=8&format=json&srsearch="
               + urllib.parse.quote(q))
        st, obj, err = fetch_json(url)
        if err:
            log("- Bulbagarden Archives, ricerca \"%s\": non raggiungibile (stato %s, %s)" % (q, st, err))
        else:
            hits = obj.get("query", {}).get("search", [])
            log("- Bulbagarden Archives, ricerca \"%s\": %d risultati, es. %s" % (
                q, obj.get("query", {}).get("searchinfo", {}).get("totalhits", len(hits)), "; ".join(h["title"] for h in hits[:5])))
        pause()
    url = "https://bulbapedia.bulbagarden.net/w/api.php?action=query&list=search&srlimit=8&format=json&srsearch=" + urllib.parse.quote("Vending series")
    st, obj, err = fetch_json(url)
    if err:
        log("- Bulbapedia, ricerca \"Vending series\": non raggiungibile (stato %s, %s)" % (st, err))
    else:
        log("- Bulbapedia, ricerca \"Vending series\": %s" % "; ".join(h["title"] for h in obj.get("query", {}).get("search", [])[:6]))
    pause()

    # Database ufficiale giapponese
    q = urllib.parse.quote("ミュウex")
    st, data, err = fetch("https://www.pokemon-card.com/card-search/resultAPI.php?keyword=%s&regulation_sidebar_form=all&page=1" % q)
    if err:
        log("- database ufficiale giapponese: non raggiungibile (stato %s, %s)" % (st, err))
    else:
        text = data.decode("utf-8", "replace")
        log("- database ufficiale giapponese: risposta %s, %s; inizio: `%s`" % (st, size(len(data)), text[:250].replace("`", "'")))
    pause()

    # Limitless
    st, data, err = fetch("https://limitlesstcg.com/cards/jp/SV2a/201")
    if err:
        log("- Limitless, carta SV2a 201: non raggiungibile (stato %s, %s)" % (st, err))
    else:
        text = data.decode("utf-8", "replace")
        imgs = [m for m in re.findall(r'src="([^"]+\.(?:png|jpg|webp))"', text) if "SV2a" in m or "sv2a" in m.lower()]
        log("- Limitless, carta SV2a 201: risposta %s, immagini trovate: %s" % (st, "; ".join(imgs[:3]) or "nessuna"))
    pause()

    # TCG Collector
    st, data, err = fetch("https://www.tcgcollector.com/expansions/jp")
    if err:
        log("- TCG Collector, espansioni giapponesi: non raggiungibile (stato %s, %s)" % (st, err))
    else:
        text = data.decode("utf-8", "replace")
        n = len(re.findall(r"(?i)vending", text))
        log("- TCG Collector, espansioni giapponesi: risposta %s, %s, citazioni di \"Vending\": %d" % (st, size(len(data)), n))
    log()


def main():
    now = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    trigger = os.environ.get("GITHUB_EVENT_NAME", "manuale")
    log("# Resoconto verifica fonti")
    log()
    log("Eseguito: %s, avvio: %s" % (now, trigger))
    log()
    check_tcgdex()
    check_cardmarket()
    check_pokemontcg()
    check_ecb()
    for step in (lambda: check_cardmarket_products(check_japanese()), check_tcgcsv, check_images):
        try:
            step()
        except Exception as e:  # una fonte che fallisce non deve fermare le altre
            log("- errore inatteso: %r" % e)
            log()

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "resoconto.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(LINES) + "\n")
    path = os.path.join(OUT_DIR, "esecuzioni.md")
    new = not os.path.exists(path)
    with open(path, "a", encoding="utf-8") as f:
        if new:
            f.write("# Esecuzioni\n\nUna riga per ogni volta che la verifica gira.\n\n")
        f.write("- %s, avvio: %s\n" % (now, trigger))


if __name__ == "__main__":
    main()

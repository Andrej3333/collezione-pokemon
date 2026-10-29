"""Verifica delle fonti dati per l'app collezione Pokemon.

Gira sui server di GitHub (GitHub Actions). Controlla:
  1. TCGdex: set e carte in inglese, italiano e giapponese, presenza delle immagini,
     dati di prezzo e collegamento ai prodotti Cardmarket.
  2. Cardmarket: file pubblici di prodotti e prezzi.
  3. pokemontcg.io: prezzi TCGplayer e Cardmarket.
  4. Banca centrale europea: cambi del giorno (yen e dollaro).

Scrive il resoconto in verifiche/resoconto.md e aggiunge una riga a
verifiche/esecuzioni.md, cosi si vede anche se i lavori programmati partono.
Usa solo la libreria standard di Python.
"""

import datetime as dt
import gzip
import json
import os
import urllib.error
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

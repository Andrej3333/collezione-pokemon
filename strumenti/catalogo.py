"""Genera il catalogo leggero delle carte da TCGdex.

Scrive app/public/catalogo/<lingua>.json per inglese, italiano e giapponese,
piu meta.json con la data. I file vengono pubblicati insieme all'app, cosi
la ricerca e veloce e non interroga TCGdex a ogni tasto.

Formato di <lingua>.json:
  {"sets": [[id, nome, totale], ...],
   "cards": [[id, numero, nome, immagine_o_vuoto], ...]}
"""

import datetime as dt
import json
import os
import sys
import urllib.request

LINGUE = ["en", "it", "ja"]
BASE = "https://api.tcgdex.net/v2"
OUT = os.path.join("app", "public", "catalogo")
UA = "collezione-pokemon-catalogo/1.0 (uso personale)"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = {"generato": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "lingue": {}}
    for lang in LINGUE:
        sets = get("%s/%s/sets" % (BASE, lang))
        cards = get("%s/%s/cards" % (BASE, lang))
        out = {
            "sets": [[s.get("id"), s.get("name"), (s.get("cardCount") or {}).get("total")] for s in sets],
            "cards": [[c.get("id"), c.get("localId"), c.get("name"), c.get("image") or ""] for c in cards],
        }
        path = os.path.join(OUT, "%s.json" % lang)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        meta["lingue"][lang] = {"set": len(sets), "carte": len(cards)}
        print("%s: %d set, %d carte, %d KB" % (lang, len(sets), len(cards), os.path.getsize(path) // 1024))
    with open(os.path.join(OUT, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("errore nella generazione del catalogo: %r" % e, file=sys.stderr)
        sys.exit(1)

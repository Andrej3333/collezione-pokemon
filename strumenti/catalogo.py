"""Genera il catalogo leggero delle carte da TCGdex.

Scrive app/public/catalogo/<lingua>.json per inglese, italiano e giapponese,
piu meta.json con la data, e un resoconto in verifiche/catalogo.md. I file
vengono pubblicati insieme all'app, cosi la ricerca e veloce e non interroga
TCGdex a ogni tasto.

Formato di <lingua>.json:
  {"sets": [[id, nome, totale, serie, data_uscita, sigla, logo, altri_nomi], ...],
   "cards": [[id, numero, nome, immagine_o_vuoto, alias], ...]}

- altri_nomi: i nomi dello stesso set e della sua serie nelle altre lingue, per la ricerca
- alias: per le carte giapponesi, il nome inglese dei Pokemon che compaiono nel nome
  (da PokeAPI), cosi "pikachu" trova anche ピカチュウ
"""

import csv
import datetime as dt
import io
import json
import os
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

LINGUE = ["en", "it", "ja"]
BASE = "https://api.tcgdex.net/v2"
GRUPPI_JP = "https://tcgcsv.com/tcgplayer/85/groups"
SPECIE = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv"
OUT = os.path.join("app", "public", "catalogo")
RESOCONTO = os.path.join("verifiche", "catalogo.md")
UA = "collezione-pokemon-catalogo/1.0 (uso personale)"


def scarica(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def get(url):
    return json.loads(scarica(url).decode("utf-8"))


def dettagli_set(lang, ids):
    """Serie, data di uscita e sigla di ogni set; se un set non risponde, resta senza."""
    def uno(i):
        try:
            return i, get("%s/%s/sets/%s" % (BASE, lang, urllib.parse.quote(i)))
        except Exception:
            return i, {}
    with ThreadPoolExecutor(max_workers=8) as ex:
        return dict(ex.map(uno, ids))


def nomi_specie():
    """{nome giapponese: nome inglese} per tutte le specie, in katakana e in kanji."""
    righe = csv.DictReader(io.StringIO(scarica(SPECIE).decode("utf-8")))
    per_id = {}
    for r in righe:
        per_id.setdefault(r["pokemon_species_id"], {})[r["local_language_id"]] = r["name"]
    out = {}
    for nomi in per_id.values():
        en = nomi.get("9")
        if not en:
            continue
        for lid in ("1", "11"):  # ja-Hrkt, ja
            if nomi.get(lid):
                out[nomi[lid]] = en
    return out


def nomi_inglesi_jp():
    """{sigla del set giapponese: nome inglese} dai set giapponesi di TCGplayer (via TCGCSV)."""
    out = {}
    for g in get(GRUPPI_JP).get("results", []):
        nome = g.get("name") or ""
        sigla = (g.get("abbreviation") or "").strip()
        if not sigla and ":" in nome:
            sigla = nome.split(":", 1)[0].strip()
        if sigla:
            out[sigla.lower()] = nome.split(":", 1)[1].strip() if ":" in nome else nome
    return out


def alias_giapponese(nome, specie, ordinati):
    """I nomi inglesi dei Pokemon contenuti nel nome giapponese, dal piu lungo (ミュウツー prima di ミュウ)."""
    trovati = []
    preso = [False] * len(nome)
    for jp in ordinati:
        start = nome.find(jp)
        while start >= 0:
            if not any(preso[start:start + len(jp)]):
                for k in range(start, start + len(jp)):
                    preso[k] = True
                if specie[jp] not in trovati:
                    trovati.append(specie[jp])
            start = nome.find(jp, start + 1)
    return " ".join(trovati)


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = {"generato": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "lingue": {}}
    resoconto = ["# Catalogo", "", "Generato: %s UTC" % meta["generato"][:16].replace("T", " "), ""]

    try:
        specie = nomi_specie()
        resoconto.append("- nomi delle specie da PokeAPI: %d nomi giapponesi" % len(specie))
    except Exception as e:
        specie = {}
        resoconto.append("- **nomi delle specie non scaricati**: %r" % e)
    ordinati = sorted(specie, key=len, reverse=True)
    try:
        inglesi_jp = nomi_inglesi_jp()
        resoconto.append("- nomi inglesi dei set giapponesi da TCGplayer: %d" % len(inglesi_jp))
    except Exception as e:
        inglesi_jp = {}
        resoconto.append("- **nomi inglesi dei set giapponesi non scaricati**: %r" % e)

    grezzi = {}
    for lang in LINGUE:
        sets = get("%s/%s/sets" % (BASE, lang))
        cards = get("%s/%s/cards" % (BASE, lang))
        det = dettagli_set(lang, [s.get("id") for s in sets])
        grezzi[lang] = (sets, cards, det)

    # nomi di ogni set e serie in tutte le lingue, per trovarli con qualsiasi lingua
    nomi_per_set = {}
    for lang, (sets, _cards, det) in grezzi.items():
        for s in sets:
            d = det.get(s.get("id")) or {}
            nomi_per_set.setdefault(s.get("id"), set()).update(
                x for x in [s.get("name"), (d.get("serie") or {}).get("name"),
                            inglesi_jp.get((s.get("id") or "").lower()) if lang == "ja" else None] if x)

    for lang, (sets, cards, det) in grezzi.items():
        out_sets = []
        for s in sets:
            d = det.get(s.get("id")) or {}
            nome = s.get("name")
            serie = (d.get("serie") or {}).get("name") or ""
            sigla = (d.get("abbreviation") or {}).get("official") or ""
            altri = sorted(nomi_per_set.get(s.get("id"), set()) - {nome, serie})
            out_sets.append([
                s.get("id"), nome, (s.get("cardCount") or {}).get("total"), serie,
                d.get("releaseDate") or "", sigla, s.get("logo") or "", " ".join(altri),
            ])
        out_cards = []
        con_alias = 0
        for c in cards:
            alias = alias_giapponese(c.get("name") or "", specie, ordinati) if lang == "ja" and specie else ""
            con_alias += 1 if alias else 0
            out_cards.append([c.get("id"), c.get("localId"), c.get("name"), c.get("image") or "", alias])
        path = os.path.join(OUT, "%s.json" % lang)
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"sets": out_sets, "cards": out_cards}, f, ensure_ascii=False, separators=(",", ":"))
        meta["lingue"][lang] = {"set": len(sets), "carte": len(cards)}
        con_data = sum(1 for x in out_sets if x[4])
        riga = "- %s: %d set (%d con data e serie), %d carte, %d KB" % (lang, len(sets), con_data, len(cards), os.path.getsize(path) // 1024)
        if lang == "ja":
            riga += ", %d carte con il nome inglese del Pokemon" % con_alias
        print(riga)
        resoconto.append(riga)
        esempi = [x for x in out_sets if x[0] in ("g1", "swsh12pt5", "SV2a", "sv03.5")]
        for x in esempi:
            resoconto.append("  - set %s: %s | serie %s | uscita %s | sigla %s | altri nomi: %s" % (x[0], x[1], x[3], x[4], x[5] or "-", x[7] or "-"))
        if lang == "ja":
            for c in out_cards[:: max(1, len(out_cards) // 8)][:8]:
                resoconto.append("  - %s %s -> %s" % (c[0], c[2], c[4] or "(nessun Pokemon riconosciuto)"))

    with open(os.path.join(OUT, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False)
    os.makedirs(os.path.dirname(RESOCONTO), exist_ok=True)
    with open(RESOCONTO, "w", encoding="utf-8") as f:
        f.write("\n".join(resoconto) + "\n")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("errore nella generazione del catalogo: %r" % e, file=sys.stderr)
        sys.exit(1)

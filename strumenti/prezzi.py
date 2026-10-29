"""Aggiornamento notturno dei prezzi.

Gira su GitHub Actions ogni notte. Per le carte in collezione, in viaggio e in wantlist:
1. completa i collegamenti mancanti ai prodotti Cardmarket e TCGplayer (da TCGdex e TCGCSV);
2. scarica i prezzi del giorno da Cardmarket (file pubblici) e TCGplayer (tramite TCGCSV);
3. scarica i cambi della BCE;
4. salva tutto nel database e scrive un resoconto in verifiche/prezzi.md.

Richiede SUPABASE_DB_URL. Per le prove, PREZZI_FINTI=<cartella> legge le risposte da file locali.
"""

import datetime as dt
import gzip
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from zoneinfo import ZoneInfo

import psycopg
from psycopg.types.json import Jsonb

CARDMARKET = "https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json"
TCGCSV = "https://tcgcsv.com/tcgplayer"
BCE = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
TCGDEX = "https://api.tcgdex.net/v2"
CATEGORIE = {3: "inglese", 85: "giapponese"}
RESOCONTO = "verifiche/prezzi.md"

FINTI = os.environ.get("PREZZI_FINTI")
oggi = dt.datetime.now(ZoneInfo("Europe/Rome")).date()
righe: list[str] = []
errori: list[str] = []


def scrivi(testo: str) -> None:
    print(testo, flush=True)
    righe.append(testo)


def scarica(url: str, tentativi: int = 3) -> bytes:
    if FINTI:
        nome = hashlib.sha1(url.encode()).hexdigest()[:16]
        percorso = os.path.join(FINTI, nome)
        if not os.path.exists(percorso):
            raise RuntimeError(f"404 (finto) {url}")
        with open(percorso, "rb") as f:
            return f.read()
    ultimo = None
    for i in range(tentativi):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "collezione-pokemon/1.0 (uso personale, una volta al giorno)",
                "Accept-Encoding": "gzip",
            })
            with urllib.request.urlopen(req, timeout=120) as r:
                dati = r.read()
                if r.headers.get("Content-Encoding") == "gzip":
                    dati = gzip.decompress(dati)
                return dati
        except urllib.error.HTTPError as e:
            if e.code == 404:
                raise
            ultimo = e
        except Exception as e:  # rete instabile: riprova
            ultimo = e
        time.sleep(2 * (i + 1))
    raise RuntimeError(f"{url}: {ultimo}")


def scarica_json(url: str):
    return json.loads(scarica(url))


def numero_base(n: str | None) -> str | None:
    """'025/165' -> '25', 'RC32/RC32' -> 'RC32', 'SV-P 001' -> 'SV-P 1'."""
    if not n:
        return None
    n = n.split("/")[0].strip().upper()
    n = re.sub(r"(?<![0-9])0+(?=[0-9])", "", n)
    return n or None


def sezione(nome: str):
    """Esegue una parte dell'aggiornamento; se fallisce lo annota e prosegue con le altre."""
    def decoratore(f):
        def dentro(*a, **k):
            try:
                return f(*a, **k)
            except Exception as e:
                errori.append(f"{nome}: {e}")
                scrivi(f"- **errore** in {nome}: {e}")
                return None
        return dentro
    return decoratore


# --- 1. Carte da seguire ----------------------------------------------------------

def carte_seguite(cur):
    return cur.execute("""
        select 'copie' as tab, id, carta_id, lingua, set_id, numero, nome, cardmarket_id, tcgplayer_id
          from public.copie where stato <> 'venduta'
        union all
        select 'wantlist', id, carta_id, lingua, set_id, numero, nome, cardmarket_id, tcgplayer_id
          from public.wantlist
    """).fetchall()


@sezione("collegamenti da TCGdex")
def collega_da_tcgdex(cur, carte):
    mancanti = {}
    for tab, _id, carta_id, lingua, *_resto, cm, tp in carte:
        if cm is None or (tp is None and lingua != "ja"):
            mancanti[(lingua, carta_id)] = True
    trovati_cm = trovati_tp = 0
    for lingua, carta_id in list(mancanti)[:400]:
        dati = None
        for l in [lingua] + (["en"] if lingua == "it" else []):
            try:
                d = scarica_json(f"{TCGDEX}/{l}/cards/{urllib.parse.quote(carta_id)}")
            except Exception:
                continue
            if d.get("pricing"):
                dati = d
                break
            dati = dati or d
        if not dati:
            continue
        pricing = dati.get("pricing") or {}
        cm = (pricing.get("cardmarket") or {}).get("idProduct")
        tp = None
        for k, v in (pricing.get("tcgplayer") or {}).items():
            if isinstance(v, dict) and v.get("productId"):
                tp = v["productId"]
                break
        for tab in ("copie", "wantlist"):
            if cm:
                r = cur.execute(f"update public.{tab} set cardmarket_id = %s where carta_id = %s and lingua = %s and cardmarket_id is null", (cm, carta_id, lingua))
                trovati_cm += r.rowcount
            if tp:
                r = cur.execute(f"update public.{tab} set tcgplayer_id = %s where carta_id = %s and lingua = %s and tcgplayer_id is null", (tp, carta_id, lingua))
                trovati_tp += r.rowcount
        time.sleep(0.1)
    scrivi(f"- collegamenti da TCGdex: {len(mancanti)} carte da completare, {trovati_cm} collegate a Cardmarket, {trovati_tp} a TCGplayer")


# --- 2. Elenco dei prodotti TCGplayer ------------------------------------------------

@sezione("elenco TCGplayer")
def aggiorna_elenco_tcgplayer(cur, forza=False):
    ultimo = cur.execute("select quando from public.aggiornamenti where nome = 'elenco_tcgplayer'").fetchone()
    vuoto = cur.execute("select count(*) from public.tcgplayer_prodotti").fetchone()[0] == 0
    if not forza and not vuoto and ultimo and ultimo[0] > dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=6):
        scrivi("- elenco TCGplayer: già aggiornato questa settimana")
        return
    gruppi = []
    for cat in CATEGORIE:
        for g in scarica_json(f"{TCGCSV}/{cat}/groups")["results"]:
            gruppi.append((g["groupId"], cat, g["name"], g.get("abbreviation") or None))

    def prodotti(g):
        gid, cat = g[0], g[1]
        try:
            res = scarica_json(f"{TCGCSV}/{cat}/{gid}/products")["results"]
        except Exception as e:
            return gid, None, str(e)
        out = []
        for p in res:
            ext = {e.get("name"): e.get("value") for e in p.get("extendedData") or []}
            num = ext.get("Number")
            if not num:
                continue  # prodotti sigillati e accessori
            out.append((p["productId"], gid, p.get("name") or "", num, numero_base(num), ext.get("Rarity")))
        return gid, out, None

    with ThreadPoolExecutor(max_workers=4) as ex:
        risultati = list(ex.map(prodotti, gruppi))

    cur.executemany("""insert into public.tcgplayer_gruppi (id, categoria, nome, sigla) values (%s, %s, %s, %s)
        on conflict (id) do update set categoria = excluded.categoria, nome = excluded.nome, sigla = excluded.sigla""", gruppi)
    tot = 0
    falliti = []
    for gid, prod, err in risultati:
        if prod is None:
            falliti.append(f"{gid} ({err})")
            continue
        if prod:
            cur.executemany("""insert into public.tcgplayer_prodotti (id, gruppo, nome, numero, numero_base, rarita)
                values (%s, %s, %s, %s, %s, %s)
                on conflict (id) do update set gruppo = excluded.gruppo, nome = excluded.nome, numero = excluded.numero,
                  numero_base = excluded.numero_base, rarita = excluded.rarita""", prod)
            tot += len(prod)
    cur.execute("""insert into public.aggiornamenti (nome, quando, note) values ('elenco_tcgplayer', now(), %s)
        on conflict (nome) do update set quando = now(), note = excluded.note""", (f"{len(gruppi)} set, {tot} carte",))
    scrivi(f"- elenco TCGplayer aggiornato: {len(gruppi)} set, {tot} carte" + (f"; set non scaricati: {', '.join(falliti[:10])}" if falliti else ""))


# --- 3. Abbinamento delle carte giapponesi ---------------------------------------------

@sezione("abbinamenti giapponesi")
def abbina_giapponesi(cur, carte):
    da_fare = [c for c in carte if c[3] == "ja" and c[8] is None]
    if not da_fare:
        scrivi("- carte giapponesi da abbinare a TCGplayer: nessuna")
        return
    abbinate = ambigue = 0
    senza_set = set()
    for tab, _id, carta_id, lingua, set_id, numero, nome, cm, tp in da_fare:
        gruppi = [g for (g,) in cur.execute("""select id from public.tcgplayer_gruppi
            where categoria = 85 and (lower(sigla) = lower(%s) or lower(nome) like lower(%s) || ':%%')""", (set_id, set_id)).fetchall()]
        if not gruppi:
            senza_set.add(set_id)
            continue
        cand = cur.execute("select id from public.tcgplayer_prodotti where gruppo = any(%s) and numero_base = %s",
                           (gruppi, numero_base(numero))).fetchall()
        if len(cand) == 1:
            cur.execute(f"update public.{tab} set tcgplayer_id = %s where id = %s and tcgplayer_id is null", (cand[0][0], _id))
            abbinate += 1
        elif cand:
            ambigue += 1
    scrivi(f"- carte giapponesi da abbinare: {len(da_fare)}; abbinate {abbinate}, con più candidati (da scegliere nell'app) {ambigue}, set non trovato {len(da_fare) - abbinate - ambigue}")
    if senza_set:
        scrivi(f"  - set giapponesi senza corrispondenza su TCGplayer: {', '.join(sorted(senza_set)[:30])}")


# --- 4. Prezzi del giorno ---------------------------------------------------------------

def salva_prezzi(cur, fonte, valori: dict[int, dict]):
    cur.executemany("""insert into public.prezzi (data, fonte, prodotto, valori) values (%s, %s, %s, %s)
        on conflict (data, fonte, prodotto) do update set valori = excluded.valori""",
                    [(oggi, fonte, pid, Jsonb(v)) for pid, v in valori.items()])


@sezione("prezzi Cardmarket")
def prezzi_cardmarket(cur, ids: set[int]):
    if not ids:
        scrivi("- Cardmarket: nessuna carta collegata")
        return
    guida = scarica_json(CARDMARKET)
    trovati = {}
    for p in guida.get("priceGuides", []):
        pid = p.get("idProduct")
        if pid in ids:
            trovati[pid] = {k.replace("-", "_"): v for k, v in p.items() if k not in ("idProduct", "idCategory") and v is not None}
    salva_prezzi(cur, "cardmarket", trovati)
    scrivi(f"- Cardmarket: file del {guida.get('createdAt', '?')}, {len(trovati)} prezzi salvati su {len(ids)} prodotti")


@sezione("prezzi TCGplayer")
def prezzi_tcgplayer(cur, ids: set[int]):
    if not ids:
        scrivi("- TCGplayer: nessuna carta collegata")
        return
    gruppi = cur.execute("""select distinct g.categoria, g.id from public.tcgplayer_prodotti p
        join public.tcgplayer_gruppi g on g.id = p.gruppo where p.id = any(%s)""", (list(ids),)).fetchall()
    trovati: dict[int, dict] = {}
    for cat, gid in gruppi:
        try:
            res = scarica_json(f"{TCGCSV}/{cat}/{gid}/prices")["results"]
        except Exception as e:
            scrivi(f"  - prezzi del set {gid} non scaricati: {e}")
            continue
        for p in res:
            pid = p.get("productId")
            if pid in ids:
                v = {k: p.get(c) for k, c in (("market", "marketPrice"), ("low", "lowPrice"), ("mid", "midPrice"), ("high", "highPrice")) if p.get(c) is not None}
                if v:
                    trovati.setdefault(pid, {})[p.get("subTypeName") or "Normal"] = v
    salva_prezzi(cur, "tcgplayer", trovati)
    scrivi(f"- TCGplayer: {len(gruppi)} set scaricati, {len(trovati)} prezzi salvati su {len(ids)} prodotti")


@sezione("cambi BCE")
def cambi(cur):
    radice = ET.fromstring(scarica(BCE))
    giorno = None
    valori = {}
    for el in radice.iter():
        if el.get("time"):
            giorno = el.get("time")
        if el.get("currency") in ("USD", "JPY"):
            valori[el.get("currency")] = float(el.get("rate"))
    cur.execute("""insert into public.cambi (data, usd, jpy) values (%s, %s, %s)
        on conflict (data) do update set usd = excluded.usd, jpy = excluded.jpy""", (giorno, valori.get("USD"), valori.get("JPY")))
    scrivi(f"- cambi BCE del {giorno}: 1 € = {valori.get('USD')} $ = {valori.get('JPY')} ¥")


def main():
    db = os.environ.get("SUPABASE_DB_URL")
    if not db:
        print("Manca SUPABASE_DB_URL", file=sys.stderr)
        sys.exit(1)
    avvio = os.environ.get("GITHUB_EVENT_NAME", "manuale")
    inizio = time.time()
    scrivi(f"# Aggiornamento prezzi\n\nEseguito: {dt.datetime.now(dt.timezone.utc):%Y-%m-%d %H:%M} UTC, avvio: {avvio}, data dei prezzi: {oggi}\n")
    with psycopg.connect(db, autocommit=True, prepare_threshold=None) as conn:
        cur = conn.cursor()
        carte = carte_seguite(cur)
        scrivi(f"- carte seguite: {len(carte)} (collezione, in viaggio e wantlist)")
        collega_da_tcgdex(cur, carte)
        aggiorna_elenco_tcgplayer(cur, forza=os.environ.get("FORZA_ELENCO") == "1")
        carte = carte_seguite(cur)
        abbina_giapponesi(cur, carte)
        carte = carte_seguite(cur)
        prezzi_cardmarket(cur, {c[7] for c in carte if c[7]})
        prezzi_tcgplayer(cur, {c[8] for c in carte if c[8]})
        cambi(cur)
        stato = "con errori" if errori else "ok"
        cur.execute("""insert into public.aggiornamenti (nome, quando, note) values ('prezzi', now(), %s)
            on conflict (nome) do update set quando = now(), note = excluded.note""", (stato,))
    scrivi(f"\nDurata: {time.time() - inizio:.0f} secondi. Esito: {'errori, vedi sopra' if errori else 'tutto a posto'}.")

    os.makedirs(os.path.dirname(RESOCONTO), exist_ok=True)
    storico = []
    if os.path.exists(RESOCONTO):
        testo = open(RESOCONTO, encoding="utf-8").read()
        if "## Esecuzioni" in testo:
            storico = [r for r in testo.split("## Esecuzioni", 1)[1].splitlines() if r.startswith("- ")]
    storico = [f"- {dt.datetime.now(dt.timezone.utc):%Y-%m-%d %H:%M} UTC, avvio: {avvio}, esito: {'errori' if errori else 'ok'}"] + storico
    with open(RESOCONTO, "w", encoding="utf-8") as f:
        f.write("\n".join(righe) + "\n\n## Esecuzioni\n\n" + "\n".join(storico[:60]) + "\n")
    sys.exit(1 if errori else 0)


if __name__ == "__main__":
    main()

import type { Lingua } from './tipi'

// Catalogo leggero generato ogni settimana da strumenti/catalogo.py
export interface CartaCatalogo {
  id: string
  numero: string
  nome: string
  immagine: string
  setId: string
  alias: string // per le giapponesi: nome inglese dei Pokemon nel nome
}

export interface SetCatalogo {
  id: string
  nome: string
  totale: number | null
  serie: string
  data: string // data di uscita, AAAA-MM-GG
  sigla: string
  logo: string
  altri: string // nomi del set e della serie nelle altre lingue
}

interface Grezzo {
  sets: (string | number | null)[][]
  cards: (string | null)[][]
}

export interface Catalogo {
  lingua: Lingua
  sets: SetCatalogo[]
  setPerId: Map<string, SetCatalogo>
  carte: CartaCatalogo[]
}

const cache = new Map<Lingua, Promise<Catalogo>>()

export function setIdDi(cartaId: string): string {
  const i = cartaId.lastIndexOf('-')
  return i > 0 ? cartaId.slice(0, i) : cartaId
}

const testo = (x: unknown) => (x == null ? '' : String(x))

export function caricaCatalogo(lingua: Lingua): Promise<Catalogo> {
  let p = cache.get(lingua)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}catalogo/${lingua}.json`)
      .then((r) => {
        if (!r.ok) throw new Error('catalogo non disponibile')
        return r.json() as Promise<Grezzo>
      })
      .then((g) => {
        const sets: SetCatalogo[] = g.sets.map((s) => ({
          id: testo(s[0]), nome: testo(s[1]), totale: s[2] == null ? null : Number(s[2]),
          serie: testo(s[3]), data: testo(s[4]), sigla: testo(s[5]), logo: testo(s[6]), altri: testo(s[7]),
        }))
        const setPerId = new Map(sets.map((s) => [s.id, s]))
        const carte = g.cards.map((c) => ({
          id: testo(c[0]), numero: testo(c[1]), nome: testo(c[2]), immagine: testo(c[3]), alias: testo(c[4]), setId: setIdDi(testo(c[0])),
        }))
        return { lingua, sets, setPerId, carte }
      })
    p.catch(() => cache.delete(lingua))
    cache.set(lingua, p)
  }
  return p
}

export function logoSet(s: SetCatalogo): string | null {
  return s.logo ? `${s.logo}.webp` : null
}

export function normalizza(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\-_.:'’&!?,()]+/g, ' ')
    .trim()
}

// Confronto dei numeri di carta: 4 < 10 < RC1 < RC10.
export function confrontaNumeri(a: string, b: string): number {
  const pa = a.match(/^([A-Za-z-]*)(\d*)(.*)$/)!
  const pb = b.match(/^([A-Za-z-]*)(\d*)(.*)$/)!
  if (pa[1] !== pb[1]) return pa[1].localeCompare(pb[1])
  const na = pa[2] ? Number(pa[2]) : -1
  const nb = pb[2] ? Number(pb[2]) : -1
  if (na !== nb) return na - nb
  return pa[3].localeCompare(pb[3])
}

// Sottoinsiemi di un set che hanno un nome proprio e una numerazione a parte.
const SOTTOINSIEMI: { frasi: string[]; prefisso: string }[] = [
  { frasi: ['radiant collection', 'collezione radiosa', 'radiant'], prefisso: 'RC' },
  { frasi: ['trainer gallery', 'galleria allenatori', 'galleria degli allenatori'], prefisso: 'TG' },
  { frasi: ['galarian gallery', 'galleria di galar'], prefisso: 'GG' },
  { frasi: ['shiny vault', 'baule shiny', 'cassaforte cromatica'], prefisso: 'SV' },
]

// Al massimo una lettera diversa, mancante, in piu o scambiata con la vicina.
function quasiUguali(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  if (a.length === b.length) {
    const diff: number[] = []
    for (let i = 0; i < a.length && diff.length <= 2; i++) if (a[i] !== b[i]) diff.push(i)
    if (diff.length <= 1) return true
    return diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]]
  }
  const [lungo, corto] = a.length > b.length ? [a, b] : [b, a]
  let i = 0
  while (i < corto.length && lungo[i] === corto[i]) i++
  return lungo.slice(i + 1) === corto.slice(i)
}

interface Indice {
  nomi: string[] // nome + alias normalizzati
  parole: string[][] // parole dei nomi, per le correzioni
  numeri: string[]
  set: Map<string, string> // testo cercabile di ogni set
}
const indici = new WeakMap<Catalogo, Indice>()

function indice(cat: Catalogo): Indice {
  let x = indici.get(cat)
  if (!x) {
    const nomi = cat.carte.map((c) => normalizza(`${c.nome} ${c.alias}`))
    x = {
      nomi,
      parole: nomi.map((n) => n.split(' ').filter((p) => p.length >= 4)),
      numeri: cat.carte.map((c) => normalizza(c.numero)),
      set: new Map(cat.sets.map((s) => [s.id, normalizza(`${s.id} ${s.nome} ${s.serie} ${s.sigla} ${s.altri}`)])),
    }
    indici.set(cat, x)
  }
  return x
}

export interface Risultato { c: CartaCatalogo; lingua: Lingua; cat: Catalogo; set?: SetCatalogo }
export interface RisultatiRicerca { carte: Risultato[]; set: { s: SetCatalogo; lingua: Lingua }[]; altri: number }

// Ricerca in uno o piu cataloghi. Ogni parola deve comparire nel nome (anche il nome inglese
// dei Pokemon giapponesi), nel numero o nel set (con i nomi nelle altre lingue, serie e sigla).
// Le parole di almeno cinque lettere tollerano un errore di battitura.
export function cerca(cats: Catalogo[], testoRicerca: string, limite = 60): RisultatiRicerca {
  let q = normalizza(testoRicerca)
  let prefisso: string | null = null
  for (const s of SOTTOINSIEMI) {
    const f = s.frasi.find((x) => (' ' + q + ' ').includes(' ' + x + ' '))
    if (f) { prefisso = s.prefisso; q = (' ' + q + ' ').replace(' ' + f + ' ', ' ').trim(); break }
  }
  const parole = q.split(' ').filter(Boolean)
  const vuoto = { carte: [], set: [], altri: 0 }
  if (parole.length === 0 && !prefisso) return vuoto

  const trovate: (Risultato & { punti: number; perSet: boolean })[] = []
  const setTrovati = new Map<string, { s: SetCatalogo; lingua: Lingua }>()

  for (const cat of cats) {
    const ix = indice(cat)
    // set che corrispondono a tutte le parole: compaiono nella riga dei set
    for (const s of cat.sets) {
      const t = ix.set.get(s.id) ?? ''
      if (parole.length > 0 && parole.every((p) => t.includes(p))) setTrovati.set(`${cat.lingua}:${s.id}`, { s, lingua: cat.lingua })
    }
    cat.carte.forEach((c, i) => {
      if (prefisso && !c.numero.toUpperCase().startsWith(prefisso)) return
      let punti = 0
      let perSet = false
      const testoSet = ix.set.get(c.setId) ?? ''
      for (const p of parole) {
        const num = ix.numeri[i]
        if (ix.nomi[i].includes(p)) punti += 3
        else if (num === p || num.replace(/^0+/, '') === p.replace(/^0+/, '')) punti += 2
        else if (testoSet.includes(p)) { punti += 1; perSet = true }
        else if (p.length >= 5 && ix.parole[i].some((w) => quasiUguali(w, p))) punti += 1
        else return
      }
      trovate.push({ c, lingua: cat.lingua, cat, set: cat.setPerId.get(c.setId), punti, perSet })
    })
  }

  for (const r of trovate) {
    if ((r.perSet || prefisso) && r.set && setTrovati.size < 40) setTrovati.set(`${r.lingua}:${r.set.id}`, { s: r.set, lingua: r.lingua })
  }
  trovate.sort((a, b) =>
    b.punti - a.punti ||
    (b.set?.data ?? '').localeCompare(a.set?.data ?? '') ||
    a.c.setId.localeCompare(b.c.setId) ||
    confrontaNumeri(a.c.numero, b.c.numero))
  const set = Array.from(setTrovati.values()).sort((a, b) => b.s.data.localeCompare(a.s.data)).slice(0, 8)
  return { carte: trovate.slice(0, limite), set, altri: Math.max(0, trovate.length - limite) }
}

// Dettagli completi di una carta, chiesti a TCGdex solo quando la aggiungi.
export interface Dettaglio {
  rarita: string | null
  illustratore: string | null
  setNome: string | null
  cardmarketId: number | null
  tcgplayerId: number | null
  immagine: string | null
  varianti: string[]
}

// Varianti indicate da TCGdex, piu quelle note che il catalogo non distingue (Shadowless del Set Base).
function variantiDa(setId: string, v: Record<string, boolean> | undefined): string[] {
  const out: string[] = []
  if (v?.firstEdition) out.push('Prima edizione')
  if (setId === 'base1') out.push('Shadowless')
  if (v?.normal) out.push(v.firstEdition ? 'Unlimited' : 'Normale')
  if (v?.holo) out.push('Holo')
  if (v?.reverse) out.push('Reverse holo')
  if (v?.wPromo) out.push('Timbro promo')
  return out
}

function primoTcgplayer(t: Record<string, unknown> | null | undefined): number | null {
  for (const v of Object.values(t ?? {})) {
    const id = (v as { productId?: number } | null)?.productId
    if (typeof id === 'number') return id
  }
  return null
}

export async function dettaglio(lingua: Lingua, id: string): Promise<Dettaglio> {
  try {
    const r = await fetch(`https://api.tcgdex.net/v2/${lingua}/cards/${encodeURIComponent(id)}`)
    if (!r.ok) throw new Error(String(r.status))
    const d = await r.json()
    return {
      rarita: d.rarity ?? null,
      illustratore: d.illustrator ?? null,
      setNome: d.set?.name ?? null,
      cardmarketId: d.pricing?.cardmarket?.idProduct ?? null,
      tcgplayerId: primoTcgplayer(d.pricing?.tcgplayer),
      immagine: d.image ?? null,
      varianti: variantiDa(setIdDi(id), d.variants),
    }
  } catch {
    return { rarita: null, illustratore: null, setNome: null, cardmarketId: null, tcgplayerId: null, immagine: null, varianti: variantiDa(setIdDi(id), undefined) }
  }
}

// Possibili indirizzi dell'immagine, in ordine: TCGdex, poi Limitless per le giapponesi.
export function indirizziImmagine(opz: {
  immagine: string | null | undefined
  lingua: Lingua
  setId: string
  numero: string
  grande?: boolean
}): string[] {
  const out: string[] = []
  if (opz.immagine) out.push(`${opz.immagine}/${opz.grande ? 'high' : 'low'}.webp`)
  if (opz.lingua === 'ja') {
    const base = 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpc'
    const n = opz.numero
    const varianti = Array.from(new Set([n, n.padStart(3, '0')]))
    for (const v of varianti) out.push(`${base}/${opz.setId}/${opz.setId}_${v}_R_JP${opz.grande ? '_LG' : ''}.png`)
  }
  return out
}

// Nome, set e immagine della stessa carta in un'altra lingua (inglese e italiano condividono il codice).
export async function cartaInLingua(cartaId: string, lingua: Lingua): Promise<{ nome: string; set_nome: string | null; immagine: string | null } | null> {
  try {
    const cat = await caricaCatalogo(lingua)
    const c = cat.carte.find((x) => x.id === cartaId)
    const s = cat.setPerId.get(setIdDi(cartaId))
    if (!c && !s) return null
    return { nome: c?.nome ?? '', set_nome: s?.nome ?? null, immagine: c?.immagine || null }
  } catch {
    return null
  }
}

// Le carte di un set. Il catalogo italiano a volte ne ha meno di quello inglese: in quel caso
// uso l'elenco inglese (stessi codici e numeri) con nomi e immagini italiani dove ci sono.
export function unisciCarteSet(proprio: Catalogo, inglese: Catalogo | undefined, setId: string): CartaCatalogo[] {
  const proprie = proprio.carte.filter((c) => c.setId === setId)
  if (proprio.lingua !== 'it' || !inglese) return proprie.sort((a, b) => confrontaNumeri(a.numero, b.numero))
  const inglesi = inglese.carte.filter((c) => c.setId === setId)
  if (inglesi.length <= proprie.length) return proprie.sort((a, b) => confrontaNumeri(a.numero, b.numero))
  const perId = new Map(proprie.map((c) => [c.id, c]))
  return inglesi.map((c) => {
    const it = perId.get(c.id)
    return it ? { ...it, immagine: it.immagine || c.immagine } : c
  }).sort((a, b) => confrontaNumeri(a.numero, b.numero))
}

export async function carteDelSet(lingua: Lingua, setId: string): Promise<CartaCatalogo[]> {
  const proprio = await caricaCatalogo(lingua)
  const inglese = lingua === 'it' ? await caricaCatalogo('en').catch(() => undefined) : undefined
  return unisciCarteSet(proprio, inglese, setId)
}

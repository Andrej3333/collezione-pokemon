import type { Lingua } from './tipi'

// Catalogo leggero generato ogni settimana da strumenti/catalogo.py
export interface CartaCatalogo {
  id: string
  numero: string
  nome: string
  immagine: string
  setId: string
}

export interface SetCatalogo {
  id: string
  nome: string
  totale: number | null
}

interface Grezzo {
  sets: [string, string, number | null][]
  cards: [string, string, string, string][]
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

export function caricaCatalogo(lingua: Lingua): Promise<Catalogo> {
  let p = cache.get(lingua)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}catalogo/${lingua}.json`)
      .then((r) => {
        if (!r.ok) throw new Error('catalogo non disponibile')
        return r.json() as Promise<Grezzo>
      })
      .then((g) => {
        const sets = g.sets.map(([id, nome, totale]) => ({ id, nome, totale }))
        const setPerId = new Map(sets.map((s) => [s.id, s]))
        const carte = g.cards.map(([id, numero, nome, immagine]) => ({ id, numero, nome, immagine, setId: setIdDi(id) }))
        return { lingua, sets, setPerId, carte }
      })
    p.catch(() => cache.delete(lingua))
    cache.set(lingua, p)
  }
  return p
}

function normalizza(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s\-_.]+/g, ' ')
    .trim()
}

// Ricerca per nome, numero e set. Ogni parola deve comparire in almeno uno dei tre.
export function cerca(cat: Catalogo, testo: string, limite = 60): CartaCatalogo[] {
  const parole = normalizza(testo).split(' ').filter(Boolean)
  if (parole.length === 0) return []
  const risultati: CartaCatalogo[] = []
  for (const c of cat.carte) {
    const set = cat.setPerId.get(c.setId)
    const campo = normalizza(`${c.nome} ${c.numero} ${c.setId} ${set?.nome ?? ''}`)
    const numero = normalizza(c.numero)
    if (parole.every((p) => campo.includes(p) || numero === p || numero.replace(/^0+/, '') === p)) {
      risultati.push(c)
      if (risultati.length >= limite) break
    }
  }
  return risultati
}

// Dettagli completi di una carta, chiesti a TCGdex solo quando la aggiungi.
export interface Dettaglio {
  rarita: string | null
  illustratore: string | null
  setNome: string | null
  cardmarketId: number | null
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
      immagine: d.image ?? null,
      varianti: variantiDa(setIdDi(id), d.variants),
    }
  } catch {
    return { rarita: null, illustratore: null, setNome: null, cardmarketId: null, immagine: null, varianti: variantiDa(setIdDi(id), undefined) }
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

import { supabase } from './supabase'

// Prezzi salvati ogni notte da strumenti/prezzi.py.

export interface ValoriCardmarket {
  trend?: number; avg?: number; low?: number; avg1?: number; avg7?: number; avg30?: number
  trend_holo?: number; avg_holo?: number; low_holo?: number; avg1_holo?: number; avg7_holo?: number; avg30_holo?: number
}
export interface ValoriSottotipo { market?: number; low?: number; mid?: number; high?: number }
export type ValoriTcgplayer = Record<string, ValoriSottotipo>

export type Fonte = 'cardmarket' | 'tcgplayer'
export interface RigaPrezzo { data: string; fonte: Fonte; prodotto: number; valori: ValoriCardmarket | ValoriTcgplayer }

export interface Prezzi {
  ultimi: Map<string, RigaPrezzo>
  usd: number | null // dollari per 1 euro, cambio BCE più recente
  aggiornato: string | null // ultimo aggiornamento notturno
}

export const PREZZI_VUOTI: Prezzi = { ultimi: new Map(), usd: null, aggiornato: null }
export const chiave = (fonte: Fonte, id: number) => `${fonte}:${id}`

async function ultimiDi(fonte: Fonte, ids: number[]): Promise<RigaPrezzo[]> {
  const out: RigaPrezzo[] = []
  for (let i = 0; i < ids.length; i += 150) {
    const r = await supabase.from('prezzi_ultimi').select('*').eq('fonte', fonte).in('prodotto', ids.slice(i, i + 150))
    if (r.error) throw new Error(r.error.message)
    out.push(...(r.data as RigaPrezzo[]))
  }
  return out
}

export async function caricaPrezzi(cardmarket: number[], tcgplayer: number[]): Promise<Prezzi> {
  const unici = (a: number[]) => Array.from(new Set(a))
  const [cm, tp, cambio, agg] = await Promise.all([
    ultimiDi('cardmarket', unici(cardmarket)),
    ultimiDi('tcgplayer', unici(tcgplayer)),
    supabase.from('cambi').select('data, usd').order('data', { ascending: false }).limit(1),
    supabase.from('aggiornamenti').select('quando').eq('nome', 'prezzi').maybeSingle(),
  ])
  const ultimi = new Map<string, RigaPrezzo>()
  for (const r of [...cm, ...tp]) ultimi.set(chiave(r.fonte, r.prodotto), r)
  return {
    ultimi,
    usd: cambio.data?.[0]?.usd != null ? Number(cambio.data[0].usd) : null,
    aggiornato: (agg.data as { quando: string } | null)?.quando ?? null,
  }
}

export async function storico(fonte: Fonte, prodotto: number, dal: string | null): Promise<RigaPrezzo[]> {
  let q = supabase.from('prezzi').select('*').eq('fonte', fonte).eq('prodotto', prodotto).order('data')
  if (dal) q = q.gte('data', dal)
  const r = await q
  if (r.error) throw new Error(r.error.message)
  return r.data as RigaPrezzo[]
}

export async function cambiDal(dal: string | null): Promise<Map<string, number>> {
  let q = supabase.from('cambi').select('data, usd').order('data')
  if (dal) q = q.gte('data', dal)
  const r = await q
  return new Map(((r.data ?? []) as { data: string; usd: number }[]).map((x) => [x.data, Number(x.usd)]))
}

// --- Lettura dei valori ------------------------------------------------------------

export interface Valore {
  trend: number | null
  avg1: number | null
  avg7: number | null
  avg30: number | null
  low: number | null
  holo: boolean // valori della versione reverse/foil
}

// Varianti che Cardmarket non distingue: il suo prezzo le mescola con le altre versioni.
export const VARIANTI_MISTE = ['Prima edizione', 'Shadowless', 'Unlimited']

export function valoreCardmarket(v: ValoriCardmarket | undefined, variante: string | null): Valore | null {
  if (!v) return null
  const leggi = (holo: boolean): Valore => {
    const p = (k: string) => {
      const x = (v as Record<string, number | undefined>)[holo ? `${k}_holo` : k]
      return x == null ? null : Number(x)
    }
    return { trend: p('trend'), avg1: p('avg1'), avg7: p('avg7'), avg30: p('avg30'), low: p('low'), holo }
  }
  const holo = variante === 'Reverse holo'
  const r = leggi(holo)
  if (r.trend == null && !holo && v.trend_holo != null) return leggi(true) // carta che esiste solo in versione foil
  return r.trend == null && r.avg30 == null ? null : r
}

// Variazione della media degli ultimi 7 giorni rispetto a quella degli ultimi 30.
export function andamento(v: Valore | null): number | null {
  if (!v || v.avg7 == null || !v.avg30) return null
  return (v.avg7 - v.avg30) / v.avg30
}

const PREFERENZE: Record<string, string[]> = {
  'Prima edizione': ['1st Edition Holofoil', '1st Edition', '1st Edition Normal'],
  'Reverse holo': ['Reverse Holofoil'],
  'Unlimited': ['Unlimited Holofoil', 'Unlimited', 'Holofoil', 'Normal'],
  'Shadowless': ['Unlimited Holofoil', 'Holofoil', 'Unlimited', 'Normal'],
  'Holo': ['Holofoil', 'Unlimited Holofoil'],
}
const PREDEFINITE = ['Normal', 'Holofoil', 'Unlimited Holofoil', 'Unlimited', 'Reverse Holofoil']

export const NOMI_SOTTOTIPO: Record<string, string> = {
  'Normal': 'Normale', 'Holofoil': 'Holo', 'Reverse Holofoil': 'Reverse holo',
  '1st Edition Holofoil': 'Prima edizione holo', '1st Edition': 'Prima edizione', '1st Edition Normal': 'Prima edizione',
  'Unlimited Holofoil': 'Unlimited holo', 'Unlimited': 'Unlimited',
}

export function sottotipoTcgplayer(v: ValoriTcgplayer | undefined, variante: string | null): [string, ValoriSottotipo] | null {
  if (!v) return null
  const ordine = [...(variante ? PREFERENZE[variante] ?? [] : []), ...PREDEFINITE]
  for (const k of ordine) if (v[k]?.market != null || v[k]?.low != null) return [k, v[k]]
  const resto = Object.entries(v).filter(([k]) => !k.startsWith('1st'))
  return resto[0] ?? Object.entries(v)[0] ?? null
}

export interface Principale { euro: number; fonte: Fonte; andamento: number | null }

// Il valore mostrato sotto le miniature: tendenza Cardmarket; per prima edizione e Shadowless,
// che Cardmarket non separa, il prezzo di mercato TCGplayer convertito in euro.
export function valorePrincipale(p: Prezzi, cm: number | null, tp: number | null, variante: string | null): Principale | null {
  const c = cm ? valoreCardmarket(p.ultimi.get(chiave('cardmarket', cm))?.valori as ValoriCardmarket, variante) : null
  const t = tp ? sottotipoTcgplayer(p.ultimi.get(chiave('tcgplayer', tp))?.valori as ValoriTcgplayer, variante) : null
  const tEuro = t?.[1].market != null && p.usd ? t[1].market / p.usd : null
  if (variante && VARIANTI_MISTE.includes(variante) && tEuro != null) return { euro: tEuro, fonte: 'tcgplayer', andamento: null }
  const trend = c?.trend ?? c?.avg30 ?? null
  if (trend != null) return { euro: trend, fonte: 'cardmarket', andamento: andamento(c) }
  if (tEuro != null) return { euro: tEuro, fonte: 'tcgplayer', andamento: null }
  return null
}

export function euro(n: number | null | undefined): string {
  if (n == null) return 'n.d.'
  return `€ ${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function dollari(n: number | null | undefined): string {
  if (n == null) return 'n.d.'
  return `$ ${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function percento(x: number): string {
  const v = Math.round(x * 100)
  return `${v > 0 ? '+' : ''}${v}%`
}

export function numeroBase(n: string): string {
  return n.split('/')[0].trim().toUpperCase().replace(/(?<![0-9])0+(?=[0-9])/g, '')
}

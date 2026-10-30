import type { LetturaPagina, OffertaLetta } from './pagina'
import { supabase } from './supabase'

// Letture delle pagine fatte dal browser interno (per ora Cardmarket).

export interface Lettura {
  id: string
  creato: string
  sito: string
  url: string
  prodotto: number | null
  carta_id: string | null
  lingua: string | null
  nome: string | null
  riquadro: Record<string, number | null>
  offerte: OffertaLetta[]
}

// Lingue come le scrive Cardmarket (italiano e inglese) e il codice che usiamo.
const LINGUE_CM: Record<string, string> = {
  inglese: 'en', english: 'en', italiano: 'it', italian: 'it', giapponese: 'ja', japanese: 'ja',
  francese: 'fr', french: 'fr', tedesco: 'de', german: 'de', spagnolo: 'es', spanish: 'es',
  portoghese: 'pt', portuguese: 'pt', coreano: 'ko', korean: 'ko', russo: 'ru', russian: 'ru',
  'cinese semplificato': 'zh', 's-chinese': 'zh', 'cinese tradizionale': 'zt', 't-chinese': 'zt',
  olandese: 'nl', dutch: 'nl', polacco: 'pl', polish: 'pl',
}
const NOMI_LINGUE: Record<string, string> = {
  en: 'Inglese', it: 'Italiano', ja: 'Giapponese', fr: 'Francese', de: 'Tedesco', es: 'Spagnolo',
  pt: 'Portoghese', ko: 'Coreano', ru: 'Russo', zh: 'Cinese s.', zt: 'Cinese t.', nl: 'Olandese', pl: 'Polacco',
}
export const codiceLingua = (etichetta: string) => LINGUE_CM[etichetta.trim().toLowerCase()] ?? etichetta.trim().toLowerCase()
export const nomeLingua = (codice: string) => NOMI_LINGUE[codice] ?? codice

export const ORDINE_CONDIZIONI = ['MT', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO']
const rangoCondizione = (c: string) => { const i = ORDINE_CONDIZIONI.indexOf(c.toUpperCase()); return i < 0 ? 99 : i }

export interface Riepilogo {
  totale: number
  minimo: OffertaLetta | null
  // prezzo più basso per lingua e condizione
  tabella: { lingua: string; perCondizione: Record<string, number>; offerte: number }[]
  condizioni: string[]
}

export function riepilogo(offerte: OffertaLetta[]): Riepilogo {
  const valide = offerte.filter((o) => o.prezzo != null)
  const perLingua = new Map<string, { perCondizione: Record<string, number>; offerte: number }>()
  const condizioni = new Set<string>()
  for (const o of valide) {
    const l = codiceLingua(o.lingua)
    const c = o.condizione.toUpperCase()
    condizioni.add(c)
    const r = perLingua.get(l) ?? { perCondizione: {}, offerte: 0 }
    r.offerte += 1
    if (r.perCondizione[c] == null || o.prezzo! < r.perCondizione[c]) r.perCondizione[c] = o.prezzo!
    perLingua.set(l, r)
  }
  const minimo = valide.reduce<OffertaLetta | null>((m, o) => (!m || o.prezzo! < m.prezzo! ? o : m), null)
  return {
    totale: valide.length,
    minimo,
    tabella: Array.from(perLingua.entries()).map(([lingua, r]) => ({ lingua, ...r })).sort((a, b) => b.offerte - a.offerte),
    condizioni: Array.from(condizioni).sort((a, b) => rangoCondizione(a) - rangoCondizione(b)),
  }
}

// L'offerta più economica che rispetta lingua e condizione minima (e, se c'è, il prezzo massimo).
export function migliorOfferta(offerte: OffertaLetta[], req: { lingua?: string | null; condizioneMin?: string | null; prezzoMax?: number | null }): OffertaLetta | null {
  const ok = offerte.filter((o) => o.prezzo != null &&
    (!req.lingua || codiceLingua(o.lingua) === req.lingua) &&
    (!req.condizioneMin || rangoCondizione(o.condizione) <= rangoCondizione(req.condizioneMin)) &&
    (req.prezzoMax == null || o.prezzo! <= req.prezzoMax))
  return ok.reduce<OffertaLetta | null>((m, o) => (!m || o.prezzo! < m.prezzo! ? o : m), null)
}

export const descriviOfferta = (o: OffertaLetta) =>
  [nomeLingua(codiceLingua(o.lingua)), o.condizione, ...o.attributi, o.paese].filter(Boolean).join(', ')

export async function salvaLettura(l: LetturaPagina, carta: { carta_id: string; lingua: string } | null, id?: string): Promise<string> {
  const riga = {
    sito: l.sito, url: l.url, prodotto: l.prodotto, carta_id: carta?.carta_id ?? null, lingua: carta?.lingua ?? null,
    nome: `${l.nome}${l.codice ? ` (${l.codice} ${l.numero})` : ''}`, riquadro: l.riquadro, offerte: l.offerte,
  }
  const r = id
    ? await supabase.from('letture').update(riga).eq('id', id).select('id').single()
    : await supabase.from('letture').insert(riga).select('id').single()
  if (r.error) throw new Error(r.error.message)
  return (r.data as { id: string }).id
}

// L'ultima lettura di una carta: per prodotto Cardmarket, oppure per carta del catalogo.
export async function ultimaLettura(prodotto: number | null, cartaId: string, lingua: string): Promise<Lettura | null> {
  const filtro = prodotto ? `prodotto.eq.${prodotto},and(carta_id.eq.${cartaId},lingua.eq.${lingua})` : `and(carta_id.eq.${cartaId},lingua.eq.${lingua})`
  const r = await supabase.from('letture').select('*').eq('sito', 'cardmarket').or(filtro).order('creato', { ascending: false }).limit(1)
  if (r.error) throw new Error(r.error.message)
  return (r.data?.[0] as Lettura | undefined) ?? null
}

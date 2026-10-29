import { supabase } from './supabase'
import { costiEffettivi, VOCI_PREDEFINITE } from './importazione'
import type { Collezione, Copia, Desiderio, Legame, Ordine, Posizione, VoceImportazione } from './tipi'

function controlla<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message)
  return r.data as T
}

export async function elencoCopie(): Promise<Copia[]> {
  return controlla(await supabase.from('copie').select('*').order('created_at', { ascending: false }))
}

export async function leggiCopia(id: string): Promise<Copia> {
  return controlla(await supabase.from('copie').select('*').eq('id', id).single())
}

export async function nuovaCopia(c: Partial<Copia>): Promise<Copia> {
  return controlla(await supabase.from('copie').insert(c).select().single())
}

export async function aggiornaCopia(id: string, c: Partial<Copia>): Promise<Copia> {
  return controlla(await supabase.from('copie').update(c).eq('id', id).select().single())
}

export async function eliminaCopia(id: string): Promise<void> {
  controlla(await supabase.from('copie').delete().eq('id', id))
}

export async function elencoCollezioni(): Promise<Collezione[]> {
  return controlla(await supabase.from('collezioni').select('*').order('created_at'))
}

export async function nuovaCollezione(c: Partial<Collezione>): Promise<Collezione> {
  return controlla(await supabase.from('collezioni').insert(c).select().single())
}

export async function eliminaCollezione(id: string): Promise<void> {
  controlla(await supabase.from('collezioni').delete().eq('id', id))
}

export async function elencoLegami(): Promise<Legame[]> {
  return controlla(await supabase.from('collezione_copie').select('collezione_id, copia_id'))
}

export async function collega(collezioneId: string, copiaId: string): Promise<void> {
  controlla(await supabase.from('collezione_copie').upsert({ collezione_id: collezioneId, copia_id: copiaId }))
}

export async function scollega(collezioneId: string, copiaId: string): Promise<void> {
  controlla(await supabase.from('collezione_copie').delete().eq('collezione_id', collezioneId).eq('copia_id', copiaId))
}

export async function elencoPosizioni(): Promise<Posizione[]> {
  return controlla(await supabase.from('posizioni').select('id, nome').order('nome'))
}

export async function nuovaPosizione(nome: string): Promise<Posizione> {
  return controlla(await supabase.from('posizioni').insert({ nome }).select('id, nome').single())
}

export async function rinominaPosizione(id: string, nome: string): Promise<void> {
  controlla(await supabase.from('posizioni').update({ nome }).eq('id', id))
}

export async function eliminaPosizione(id: string): Promise<void> {
  controlla(await supabase.from('posizioni').delete().eq('id', id))
}

// Foto personali: cartella privata foto/<id utente>/<id copia>.<estensione>
export async function caricaFoto(copiaId: string, file: File): Promise<string> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) throw new Error('non sei collegato')
  const est = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const percorso = `${u.user.id}/${copiaId}.${est}`
  controlla(await supabase.storage.from('foto').upload(percorso, file, { upsert: true, contentType: file.type }))
  await aggiornaCopia(copiaId, { foto_url: percorso })
  return percorso
}

const fotoCache = new Map<string, Promise<string | null>>()

export function indirizzoFoto(percorso: string): Promise<string | null> {
  let p = fotoCache.get(percorso)
  if (!p) {
    p = supabase.storage
      .from('foto')
      .createSignedUrl(percorso, 60 * 60 * 24)
      .then((r) => r.data?.signedUrl ?? null)
    fotoCache.set(percorso, p)
  }
  return p
}

// --- Wantlist
export async function elencoWantlist(): Promise<Desiderio[]> {
  return controlla(await supabase.from('wantlist').select('*').order('created_at', { ascending: false }))
}

export async function nuoviDesideri(d: Partial<Desiderio>[]): Promise<Desiderio[]> {
  return controlla(await supabase.from('wantlist').insert(d).select())
}

export async function aggiornaDesiderio(id: string, d: Partial<Desiderio>): Promise<void> {
  controlla(await supabase.from('wantlist').update(d).eq('id', id))
}

export async function eliminaDesiderio(id: string): Promise<void> {
  controlla(await supabase.from('wantlist').delete().eq('id', id))
}

// --- Ordini
export async function elencoOrdini(): Promise<Ordine[]> {
  return controlla(await supabase.from('ordini').select('*').order('data', { ascending: false }))
}

export async function nuovoOrdine(o: Partial<Ordine>): Promise<Ordine> {
  return controlla(await supabase.from('ordini').insert(o).select().single())
}

export async function aggiornaOrdine(id: string, o: Partial<Ordine>): Promise<void> {
  controlla(await supabase.from('ordini').update(o).eq('id', id))
}

export async function eliminaOrdine(id: string): Promise<void> {
  controlla(await supabase.from('ordini').delete().eq('id', id))
}

export const valoreMerce = (carte: Pick<Copia, 'prezzo_pagato'>[]) => carte.reduce((a, c) => a + Number(c.prezzo_pagato || 0), 0)

// Spese dell'ordine oltre alle carte, con le tasse stimate dove non sono confermate.
export function speseOrdine(o: Ordine, carte: Copia[], voci: VoceImportazione[]): number {
  return costiEffettivi(o, valoreMerce(carte), voci).totale
}

// Divide le spese dell'ordine sulle carte, in proporzione al prezzo; se nessuna ha un prezzo, in parti uguali.
export function calcolaQuote(o: Ordine, carte: Copia[], voci: VoceImportazione[]): Map<string, number> {
  const spese = speseOrdine(o, carte, voci)
  const tot = valoreMerce(carte)
  const quote = new Map<string, number>()
  let assegnato = 0
  carte.forEach((c, i) => {
    let q = tot > 0 ? (spese * Number(c.prezzo_pagato || 0)) / tot : spese / carte.length
    q = Math.round(q * 100) / 100
    if (i === carte.length - 1) q = Math.round((spese - assegnato) * 100) / 100 // l'ultima prende i centesimi di arrotondamento
    assegnato += q
    quote.set(c.id, q)
  })
  return quote
}

export async function salvaQuote(o: Ordine, carte: Copia[], voci: VoceImportazione[]): Promise<boolean> {
  const quote = calcolaQuote(o, carte, voci)
  let cambiate = false
  for (const c of carte) {
    const q = quote.get(c.id) ?? 0
    if (Number(c.quota_spese ?? -1) !== q) { await aggiornaCopia(c.id, { quota_spese: q }); cambiate = true }
  }
  return cambiate
}

// --- Regole per le tasse di importazione
export async function elencoVoci(): Promise<VoceImportazione[]> {
  let voci: VoceImportazione[] = controlla(await supabase.from('voci_importazione').select('*').order('created_at'))
  if (voci.length === 0) voci = controlla(await supabase.from('voci_importazione').insert(VOCI_PREDEFINITE).select())
  return voci
}

export async function nuovaVoce(v: Partial<VoceImportazione>): Promise<void> {
  controlla(await supabase.from('voci_importazione').insert(v))
}

export async function aggiornaVoce(id: string, v: Partial<VoceImportazione>): Promise<void> {
  controlla(await supabase.from('voci_importazione').update(v).eq('id', id))
}

export async function eliminaVoce(id: string): Promise<void> {
  controlla(await supabase.from('voci_importazione').delete().eq('id', id))
}

export async function ripristinaVoci(voci: VoceImportazione[]): Promise<void> {
  for (const v of voci) await eliminaVoce(v.id)
  controlla(await supabase.from('voci_importazione').insert(VOCI_PREDEFINITE))
}

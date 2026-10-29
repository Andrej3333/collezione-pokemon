import { supabase } from './supabase'
import type { Collezione, Copia, Legame, Posizione } from './tipi'

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

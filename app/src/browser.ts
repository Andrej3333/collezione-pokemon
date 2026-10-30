import { Capacitor } from '@capacitor/core'
import { InAppBrowser, ToolBarType } from '@capgo/capacitor-inappbrowser'
import { supabase } from './supabase'

export interface Sito { nome: string; url: string }

export const SITI_PREDEFINITI: Sito[] = [
  { nome: 'Cardmarket', url: 'https://www.cardmarket.com/it/Pokemon' },
  { nome: 'eBay', url: 'https://www.ebay.it/' },
  { nome: 'TCGplayer', url: 'https://www.tcgplayer.com/' },
  { nome: 'PriceCharting', url: 'https://www.pricecharting.com/category/pokemon-cards' },
  { nome: 'Pokecazilla', url: 'https://pokecazilla.com/' },
  { nome: 'Mercari Giappone', url: 'https://jp.mercari.com/' },
  { nome: 'Yahoo Aste Giappone', url: 'https://auctions.yahoo.co.jp/' },
  { nome: 'Bulbapedia', url: 'https://bulbapedia.bulbagarden.net/wiki/Main_Page' },
]

export const URL_APK = 'https://github.com/Andrej3333/collezione-pokemon/releases/latest/download/collezione-pokemon.apk'

// Vero quando l'app gira dentro l'app Android, con il browser interno disponibile.
export const appNativa = () => Capacitor.isNativePlatform()

export async function leggiSiti(): Promise<Sito[]> {
  const r = await supabase.from('preferenze').select('dati').maybeSingle()
  const siti = (r.data?.dati as { siti?: Sito[] } | undefined)?.siti
  return Array.isArray(siti) && siti.length > 0 ? siti : SITI_PREDEFINITI
}

export async function salvaSiti(siti: Sito[]): Promise<void> {
  const r = await supabase.from('preferenze').select('dati').maybeSingle()
  const dati = { ...((r.data?.dati as Record<string, unknown>) ?? {}), siti }
  const w = await supabase.from('preferenze').upsert({ dati, updated_at: new Date().toISOString() })
  if (w.error) throw new Error(w.error.message)
}

// Un indirizzo vero, oppure una ricerca su Google.
export function indirizzoDa(testo: string): string {
  const t = testo.trim()
  if (/^https?:\/\//i.test(t)) return t
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t)) return `https://${t}`
  return `https://www.google.com/search?q=${encodeURIComponent(t)}`
}

export async function apri(url: string, titolo?: string): Promise<void> {
  if (!appNativa()) { window.open(url, '_blank', 'noopener'); return }
  await InAppBrowser.openWebView({
    url,
    title: titolo ?? '',
    toolbarType: ToolBarType.NAVIGATION,
    showReloadButton: true,
    toolbarColor: '#181b21',
    toolbarTextColor: '#e8eaed',
  })
}

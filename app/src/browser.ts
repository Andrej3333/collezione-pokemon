import { Capacitor } from '@capacitor/core'
import { InAppBrowser, ToolBarType } from '@capgo/capacitor-inappbrowser'
import { scriptPagina, type Barra, type LetturaPagina } from './pagina'
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

// --- Esempi di pagina ------------------------------------------------------------
// Sulle pagine dei siti da leggere compare il pulsante "Invia esempio": salva nel tuo database
// privato la parte della pagina con i dati pubblici (senza intestazione, menu e account),
// per scrivere o sistemare il lettore di quel sito.

const CHIAVE = Math.random().toString(36).slice(2) + Date.now().toString(36)

// Chi gestisce letture e scelte: lo registra l'app (GestoreLetture), che conosce collezione e wantlist.
export type RispostaBarra = Barra | null
export interface GestoreLetture {
  lettura: (l: LetturaPagina) => Promise<RispostaBarra>
  scelta: (azione: string, prodotto: number | null) => Promise<RispostaBarra>
}
let gestore: GestoreLetture | null = null
export function impostaGestore(g: GestoreLetture | null) { gestore = g }

async function aBarra(id: string | undefined, b: RispostaBarra) {
  if (!b) return
  await InAppBrowser.postMessage({ detail: { tipo: 'barra', ...b }, id }).catch(() => {})
}

export async function chiudiBrowser(): Promise<void> {
  await InAppBrowser.close().catch(() => {})
}

let pronto = false
async function preparaAscolto(): Promise<void> {
  if (pronto) return
  pronto = true
  // la pagina appena caricata può ancora cambiare: riprovo dopo un attimo (la barra non si duplica)
  await InAppBrowser.addListener('browserPageLoaded', (e) => {
    for (const attesa of [0, 1200, 3500]) {
      setTimeout(() => { void InAppBrowser.executeScript({ code: scriptPagina(CHIAVE), id: e.id }).catch(() => {}) }, attesa)
    }
  })
  await InAppBrowser.addListener('messageFromWebview', (e) => {
    // Android mette i campi del messaggio direttamente nell'evento: li cerco sia lì sia in detail
    type Messaggio = { tipo?: string; chiave?: string; url?: string; titolo?: string; html?: string; azione?: string; prodotto?: number | null }
    const grezzo = e as unknown as Messaggio & { detail?: Messaggio }
    const d = grezzo.detail ?? grezzo
    if (!d || d.chiave !== CHIAVE) return
    void (async () => {
      try {
        if (d.tipo === 'campione' && d.url && d.html) {
          await InAppBrowser.postMessage({ detail: { tipo: 'campione-ricevuto' }, id: e.id }).catch(() => {})
          const r = await supabase.from('campioni').insert({ url: d.url, titolo: d.titolo ?? null, html: d.html })
          await InAppBrowser.postMessage({ detail: { tipo: 'campione-salvato', ok: !r.error, errore: r.error?.message }, id: e.id })
        } else if (d.tipo === 'lettura' && gestore) {
          await aBarra(e.id, await gestore.lettura(d as unknown as LetturaPagina))
        } else if (d.tipo === 'scelta' && gestore && d.azione) {
          await aBarra(e.id, await gestore.scelta(d.azione, d.prodotto ?? null))
        }
      } catch (err) {
        await aBarra(e.id, { testo: `Errore: ${(err as Error).message}`, colore: 'arancio' })
      }
    })()
  })
}

export interface Campione { id: string; creato: string; url: string; titolo: string | null }

export async function elencoCampioni(): Promise<Campione[]> {
  const r = await supabase.from('campioni').select('id, creato, url, titolo').order('creato', { ascending: false })
  if (r.error) throw new Error(r.error.message)
  return r.data as Campione[]
}

export async function scaricaCampione(c: Campione): Promise<void> {
  const r = await supabase.from('campioni').select('html').eq('id', c.id).single()
  if (r.error) throw new Error(r.error.message)
  const testo = `<!-- url: ${c.url} -->\n<!-- titolo: ${c.titolo ?? ''} -->\n<!-- inviato: ${c.creato} -->\n${(r.data as { html: string }).html}\n`
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([testo], { type: 'text/html' }))
  let host = 'pagina'
  try { host = new URL(c.url).hostname.replace(/^www\./, '') } catch { /* indirizzo non valido */ }
  a.download = `esempio-${host}-${c.creato.slice(0, 16).replace(/[^0-9]/g, '')}.html`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

export async function eliminaCampione(id: string): Promise<void> {
  const r = await supabase.from('campioni').delete().eq('id', id)
  if (r.error) throw new Error(r.error.message)
}

export async function apri(url: string, titolo?: string): Promise<void> {
  if (!appNativa()) { window.open(url, '_blank', 'noopener'); return }
  await preparaAscolto()
  await InAppBrowser.openWebView({
    url,
    title: titolo ?? '',
    toolbarType: ToolBarType.NAVIGATION,
    showReloadButton: true,
    enabledSafeBottomMargin: true, // la pagina non finisce sotto i tasti di Android
    toolbarColor: '#181b21',
    toolbarTextColor: '#e8eaed',
  })
}

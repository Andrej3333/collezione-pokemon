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

// --- Esempi di pagina ------------------------------------------------------------
// Sulle pagine dei siti da leggere compare il pulsante "Invia esempio": salva nel tuo database
// privato la parte della pagina con i dati pubblici (senza intestazione, menu e account),
// per scrivere o sistemare il lettore di quel sito.

const SITI_DA_LEGGERE = /(^|\.)(cardmarket\.com)$/
const CHIAVE = Math.random().toString(36).slice(2) + Date.now().toString(36)

function iniettore(): string {
  return `(function () {
  if (!${SITI_DA_LEGGERE}.test(location.hostname) || !document.body) return;
  if (document.querySelector('button[data-collezione]')) return;
  var b = document.createElement('button');
  b.setAttribute('data-collezione', '1');
  b.textContent = 'Invia esempio';
  b.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483647;padding:10px 16px;border-radius:20px;border:0;background:#3d63f2;color:#fff;font:600 14px sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.45)';
  b.onclick = function () {
    if (!window.mobileApp) { b.textContent = 'Collegamento non pronto, riprova'; return; }
    b.textContent = 'Invio…';
    var c = document.body.cloneNode(true);
    c.querySelectorAll('script,style,noscript,svg,iframe,link,meta,header,nav,footer,input,textarea,select,[data-collezione],[class*="account" i],[id*="account" i],[class*="login" i],[class*="cart" i],[id*="cart" i],[class*="cookie" i],[class*="navbar" i]').forEach(function (e) { e.remove(); });
    var tieni = /^(class|id|href|title|alt|src|aria-label|colspan|data-[a-z0-9-]+)$/i;
    c.querySelectorAll('*').forEach(function (e) { Array.prototype.slice.call(e.attributes).forEach(function (a) { if (!tieni.test(a.name)) e.removeAttribute(a.name); }); });
    var html = c.innerHTML.replace(/\\s+/g, ' ');
    if (html.length > 600000) html = html.slice(0, 600000);
    window.mobileApp.postMessage({ tipo: 'campione', chiave: '${CHIAVE}', url: location.href, titolo: document.title, html: html });
  };
  if (window.__collezioneAscolto) { document.body.appendChild(b); return; }
  window.__collezioneAscolto = true;
  window.addEventListener('messageFromNative', function (e) {
    var b = document.querySelector('button[data-collezione]'); if (!b) return;
    var d = (e && e.detail) || {};
    if (d.tipo !== 'campione-salvato') return;
    b.textContent = d.ok ? 'Esempio salvato ✓' : 'Non salvato: ' + (d.errore || 'errore');
    setTimeout(function () { b.textContent = 'Invia esempio'; }, 3500);
  });
  document.body.appendChild(b);
})();`
}

let pronto = false
async function preparaAscolto(): Promise<void> {
  if (pronto) return
  pronto = true
  // la pagina appena caricata può ancora cambiare: riprovo dopo un attimo (il pulsante non si duplica)
  await InAppBrowser.addListener('browserPageLoaded', (e) => {
    for (const attesa of [0, 1200, 3500]) {
      setTimeout(() => { void InAppBrowser.executeScript({ code: iniettore(), id: e.id }).catch(() => {}) }, attesa)
    }
  })
  await InAppBrowser.addListener('messageFromWebview', (e) => {
    const d = e.detail as { tipo?: string; chiave?: string; url?: string; titolo?: string; html?: string } | undefined
    if (!d || d.chiave !== CHIAVE || d.tipo !== 'campione' || !d.url || !d.html) return
    void (async () => {
      const r = await supabase.from('campioni').insert({ url: d.url, titolo: d.titolo ?? null, html: d.html })
      await InAppBrowser.postMessage({ detail: { tipo: 'campione-salvato', ok: !r.error, errore: r.error?.message }, id: e.id })
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
    toolbarColor: '#181b21',
    toolbarTextColor: '#e8eaed',
  })
}

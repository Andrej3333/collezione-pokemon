/* eslint-disable */
// Codice che il browser interno inserisce nelle pagine dei siti. Viene trasformato in testo
// con toString(), quindi la funzione non deve usare nulla definito fuori da sé.
//
// Fa tre cose:
// - sulle pagine di una carta di Cardmarket legge prodotto, riquadro dei prezzi e offerte
//   visibili, e li manda all'app (anche quando carichi altre offerte);
// - mostra in basso una barra con il risultato e le scelte che l'app propone;
// - tiene il pulsante "Esempio" per salvare la pagina e sistemare il lettore.

export interface OffertaLetta {
  venditore: string
  paese: string
  condizione: string
  lingua: string
  attributi: string[]
  prezzo: number | null
  quantita: number
  commento: string
}

export interface LetturaPagina {
  tipo: 'lettura'
  chiave: string
  sito: 'cardmarket'
  url: string
  prodotto: number | null
  nome: string
  codice: string
  numero: string
  espansione: string
  riquadro: Record<string, number | null>
  offerte: OffertaLetta[]
}

export interface PulsanteBarra { azione: string; etichetta: string; primario?: boolean }
export interface Barra { testo: string; sotto?: string; pulsanti?: PulsanteBarra[]; colore?: 'verde' | 'arancio' | 'neutro' }

function paginaCollezione(CHIAVE: string) {
  const w = window as any
  if (!document.body) return
  const suCardmarket = /(^|\.)cardmarket\.com$/.test(location.hostname)
  const paginaCarta = suCardmarket && /\/Products\/Singles\//i.test(location.pathname)
  if (!paginaCarta) return
  if (document.getElementById('collezione-barra')) return

  const manda = (dati: any) => {
    if (!w.mobileApp) return false
    w.mobileApp.postMessage({ detail: Object.assign({ chiave: CHIAVE }, dati) })
    return true
  }

  // --- barra in basso ---------------------------------------------------------
  const barra = document.createElement('div')
  barra.id = 'collezione-barra'
  barra.setAttribute('data-collezione', '1')
  barra.style.cssText = 'position:fixed;left:8px;right:8px;bottom:calc(env(safe-area-inset-bottom, 0px) + 8px);z-index:2147483647;' +
    'background:#181b21;color:#e8eaed;border:1px solid #3a404b;border-radius:14px;padding:10px 12px;font:14px/1.4 sans-serif;' +
    'box-shadow:0 4px 16px rgba(0,0,0,.5);display:flex;flex-direction:column;gap:8px;touch-action:manipulation'
  const riga = document.createElement('div')
  riga.style.cssText = 'display:flex;align-items:flex-start;gap:8px'
  const testo = document.createElement('div')
  testo.style.cssText = 'flex:1;min-width:0'
  testo.textContent = 'Lettura della pagina…'
  const piccolo = document.createElement('button')
  piccolo.textContent = '–'
  piccolo.setAttribute('aria-label', 'Riduci')
  piccolo.style.cssText = 'flex:none;width:32px;height:32px;border-radius:8px;border:1px solid #3a404b;background:#20242c;color:#e8eaed;font-size:16px'
  riga.appendChild(testo)
  riga.appendChild(piccolo)
  const pulsanti = document.createElement('div')
  pulsanti.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px'
  barra.appendChild(riga)
  barra.appendChild(pulsanti)

  let ridotta = false
  const tocca = (el: HTMLElement, f: () => void) => {
    let fatto = 0
    const g = (e: Event) => { e.preventDefault(); e.stopPropagation(); if (Date.now() - fatto < 400) return; fatto = Date.now(); f() }
    el.addEventListener('touchend', g, { passive: false })
    el.addEventListener('click', g)
  }
  tocca(piccolo, () => {
    ridotta = !ridotta
    pulsanti.style.display = ridotta ? 'none' : 'flex'
    piccolo.textContent = ridotta ? '+' : '–'
  })

  const bottone = (etichetta: string, primario: boolean) => {
    const b = document.createElement('button')
    b.textContent = etichetta
    b.style.cssText = 'padding:8px 12px;border-radius:18px;font:600 13px sans-serif;' +
      (primario ? 'background:#3d63f2;color:#fff;border:0' : 'background:#20242c;color:#e8eaed;border:1px solid #3a404b')
    return b
  }

  let prodottoCorrente: number | null = null
  const mostra = (d: any) => {
    testo.innerHTML = ''
    const t = document.createElement('div')
    t.textContent = d.testo || ''
    t.style.color = d.colore === 'verde' ? '#7bd9a2' : d.colore === 'arancio' ? '#f5b66a' : '#e8eaed'
    testo.appendChild(t)
    if (d.sotto) {
      const s = document.createElement('div')
      s.textContent = d.sotto
      s.style.cssText = 'color:#a3a9b5;font-size:12px'
      testo.appendChild(s)
    }
    pulsanti.innerHTML = ''
    ;(d.pulsanti || []).forEach((p: any) => {
      const b = bottone(p.etichetta, !!p.primario)
      tocca(b, () => { b.textContent = '…'; manda({ tipo: 'scelta', azione: p.azione, prodotto: prodottoCorrente }) })
      pulsanti.appendChild(b)
    })
    const es = bottone('Esempio', false)
    es.style.marginLeft = 'auto'
    tocca(es, () => invia(es))
    pulsanti.appendChild(es)
    // spazio in fondo alla pagina, così la barra non copre le ultime offerte
    setTimeout(() => { document.body.style.paddingBottom = (barra.offsetHeight + 24) + 'px' }, 0)
  }

  // --- esempio di pagina -------------------------------------------------------
  const pulita = () => {
    const c = document.body.cloneNode(true) as HTMLElement
    c.querySelectorAll('script,style,noscript,svg,iframe,link,meta,header,nav,footer,input,textarea,select,[data-collezione],[class*="account" i],[id*="account" i],[class*="login" i],[class*="cart" i],[id*="cart" i],[class*="cookie" i],[class*="navbar" i]').forEach((e) => e.remove())
    const tieni = /^(class|id|href|title|alt|src|aria-label|colspan|data-[a-z0-9-]+)$/i
    c.querySelectorAll('*').forEach((e) => { Array.prototype.slice.call(e.attributes).forEach((a: Attr) => { if (!tieni.test(a.name)) e.removeAttribute(a.name) }) })
    return c
  }
  const invia = (b: HTMLElement) => {
    const c = pulita()
    const t = (c.textContent || '').replace(/\s+/g, ' ')
    if (t.length < 400 || t.indexOf('€') < 0) { b.textContent = 'Pagina non pronta'; return }
    let html = c.innerHTML.replace(/\s+/g, ' ')
    if (html.length > 600000) html = html.slice(0, 600000)
    b.textContent = manda({ tipo: 'campione', url: location.href, titolo: document.title, html }) ? 'Invio…' : 'Non collegato'
  }

  // --- lettura di Cardmarket ---------------------------------------------------
  const numero = (s: string | null | undefined): number | null => {
    if (!s) return null
    const m = s.replace(/\s/g, '').replace(/[^0-9,.\-]/g, '')
    if (!m) return null
    const n = Number(m.replace(/\./g, '').replace(',', '.'))
    return isFinite(n) ? n : null
  }
  const etichetta = (el: Element | null) => (el && (el.getAttribute('aria-label') || el.getAttribute('data-bs-original-title') || el.getAttribute('title'))) || ''

  const leggi = () => {
    let prodotto: number | null = null
    const modale = document.querySelector('[data-modal*="idProduct="]')
    const mm = modale && (modale.getAttribute('data-modal') || '').match(/idProduct=(\d+)/)
    if (mm) prodotto = Number(mm[1])
    if (!prodotto) {
      const img = document.querySelector('img[src*="product-images"]') as HTMLImageElement | null
      const mi = img && img.src.match(/\/(\d+)\/\1\.\w+$/)
      if (mi) prodotto = Number(mi[1])
    }
    const h1 = document.querySelector('h1')
    let titolo = ''
    if (h1) h1.childNodes.forEach((n) => { if (n.nodeType === 3) titolo += n.textContent })
    titolo = titolo.trim()
    const tm = titolo.match(/^(.*?)\s*\(([^()]*?)\s+([^()\s]+)\)\s*$/)
    const sotto = (h1 && h1.querySelector('span') && (h1.querySelector('span') as HTMLElement).textContent) || ''

    const riquadro: Record<string, number | null> = {}
    const chiavi: [RegExp, string][] = [
      [/articoli disponibili|available items|verfügbare artikel/i, 'disponibili'],
      [/^da$|^from$|^ab$/i, 'da'],
      [/tendenza|price trend|preis-trend/i, 'tendenza'],
      [/30 giorni|30-days|30-tage/i, 'media30'],
      [/7 giorni|7-days|7-tage/i, 'media7'],
      [/1 giorno|1-day|1-tages/i, 'media1'],
    ]
    let numeroCarta = ''
    document.querySelectorAll('dl dt').forEach((dt) => {
      const nome = (dt.textContent || '').trim()
      const dd = dt.nextElementSibling
      if (!dd) return
      if (/^(numero|number|nummer)$/i.test(nome)) numeroCarta = (dd.textContent || '').trim()
      for (const [re, k] of chiavi) if (re.test(nome)) { riquadro[k] = numero(dd.textContent); break }
    })

    const offerte: any[] = []
    document.querySelectorAll('.article-row').forEach((r) => {
      const venditore = ((r.querySelector('.seller-name a') || {}) as HTMLElement).textContent || ''
      let paese = ''
      r.querySelectorAll('.seller-name [aria-label], .seller-name [data-bs-original-title]').forEach((e) => {
        const t = etichetta(e)
        const m = t.match(/(?:locazione dell'oggetto|item location|artikelstandort)\s*:\s*(.+)$/i)
        if (m) paese = m[1].trim()
      })
      const attr = r.querySelector('.product-attributes')
      const cond = attr && attr.querySelector('.article-condition .badge')
      const etichette: string[] = []
      if (attr) attr.querySelectorAll('[aria-label], [data-bs-original-title]').forEach((e) => {
        if (e.classList.contains('article-condition')) return
        const t = etichetta(e)
        if (t) etichette.push(t)
      })
      const prezzoEl = r.querySelector('.price-container .color-primary') || r.querySelector('.color-primary')
      const qta = r.querySelector('.item-count')
      const commento = r.querySelector('.product-comments .text-truncate')
      offerte.push({
        venditore: venditore.trim(),
        paese,
        condizione: cond ? (cond.textContent || '').trim() : '',
        lingua: etichette[0] || '',
        attributi: etichette.slice(1),
        prezzo: numero(prezzoEl && prezzoEl.textContent),
        quantita: numero(qta && qta.textContent) || 1,
        commento: commento ? (commento.textContent || '').trim() : '',
      })
    })
    return {
      tipo: 'lettura', sito: 'cardmarket', url: location.href, prodotto,
      nome: tm ? tm[1].trim() : titolo, codice: tm ? tm[2].trim() : '', numero: numeroCarta || (tm ? tm[3] : ''),
      espansione: sotto.replace(/\s*-\s*singles\s*$/i, '').trim(), riquadro, offerte,
    }
  }

  let ultima = ''
  const controlla = () => {
    const l = leggi()
    if (!l.prodotto && l.offerte.length === 0) return
    const firma = l.prodotto + ':' + l.offerte.length + ':' + JSON.stringify(l.riquadro)
    if (firma === ultima) return
    prodottoCorrente = l.prodotto
    if (manda(l)) ultima = firma
    else testo.textContent = 'In attesa del collegamento con l’app…'
  }

  w.addEventListener('messageFromNative', (e: any) => {
    const d = (e && e.detail) || {}
    if (d.tipo === 'barra') mostra(d)
    else if (d.tipo === 'campione-ricevuto') testo.textContent = 'Salvataggio dell’esempio…'
    else if (d.tipo === 'campione-salvato') testo.textContent = d.ok ? 'Esempio salvato ✓ (in Impostazioni)' : 'Esempio non salvato: ' + (d.errore || '')
  })

  document.body.appendChild(barra)
  mostra({ testo: 'Lettura della pagina…' })
  controlla()
  // offerte caricate dopo ("mostra altre") o collegamento con l'app arrivato in ritardo
  let attesa: any = null
  new MutationObserver(() => { clearTimeout(attesa); attesa = setTimeout(controlla, 600) })
    .observe(document.body, { childList: true, subtree: true })
  setTimeout(controlla, 1500)
  setTimeout(controlla, 4000)
}

export function scriptPagina(chiave: string): string {
  return `(${paginaCollezione.toString()})(${JSON.stringify(chiave)});`
}

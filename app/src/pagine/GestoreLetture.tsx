import { useEffect, useRef } from 'react'
import { useArchivio } from '../archivio'
import { chiudiBrowser, impostaGestore, type RispostaBarra } from '../browser'
import { caricaCatalogo, normalizza, type CartaCatalogo, type Catalogo } from '../catalogo'
import { aggiornaCopia, aggiornaDesiderio, nuoviDesideri } from '../dati'
import { descriviOfferta, migliorOfferta, riepilogo, salvaLettura } from '../letture'
import type { LetturaPagina } from '../pagina'
import { euro, numeroBase } from '../prezzi'
import type { Copia, Desiderio, Lingua } from '../tipi'

// Riceve le letture del browser interno e decide cosa proporre nella barra in fondo alla pagina.
// Non disegna nulla: vive dentro l'app per conoscere collezione e wantlist.

type Voce = { tipo: 'copia'; x: Copia } | { tipo: 'desiderio'; x: Desiderio }

const stessoNome = (a: string, b: string) => normalizza(a) === normalizza(b)
const stessoNumero = (a: string, b: string) => numeroBase(a).replace(/[^A-Z0-9]/g, '') === numeroBase(b).replace(/[^A-Z0-9]/g, '')

function sintesi(l: LetturaPagina): string {
  const r = riepilogo(l.offerte)
  const parti = [`${l.nome}${l.codice ? ` (${l.codice} ${l.numero})` : ''}`]
  if (r.totale) parti.push(`${r.totale} offerte lette, da ${euro(r.minimo?.prezzo)}`)
  if (l.riquadro.tendenza != null) parti.push(`tendenza ${euro(l.riquadro.tendenza)}`)
  return parti.join(' · ')
}

// Le carte del catalogo con lo stesso nome e numero, per lingua; il set con la stessa sigla o nome viene prima.
async function trovaNelCatalogo(l: LetturaPagina): Promise<{ c: CartaCatalogo; lingua: Lingua; cat: Catalogo }[]> {
  const out: { c: CartaCatalogo; lingua: Lingua; cat: Catalogo; punti: number }[] = []
  for (const lingua of ['en', 'it', 'ja'] as Lingua[]) {
    let cat: Catalogo
    try { cat = await caricaCatalogo(lingua) } catch { continue }
    for (const c of cat.carte) {
      if (!stessoNumero(c.numero, l.numero)) continue
      if (!stessoNome(c.nome, l.nome) && !(c.alias && stessoNome(c.alias, l.nome))) continue
      const s = cat.setPerId.get(c.setId)
      let punti = 0
      if (s?.sigla && l.codice && s.sigla.toUpperCase() === l.codice.toUpperCase()) punti += 2
      if (s && l.espansione && [s.nome, ...s.altri.split(' ')].some((n) => n && normalizza(n) === normalizza(l.espansione))) punti += 1
      out.push({ c, lingua, cat, punti })
    }
  }
  return out.sort((a, b) => b.punti - a.punti)
}

export function GestoreLetture() {
  const archivio = useArchivio()
  const rif = useRef(archivio)
  rif.current = archivio
  const ultime = useRef(new Map<number, LetturaPagina>())
  const salvate = useRef(new Map<string, string>()) // url della pagina -> id della lettura

  useEffect(() => {
    const salva = async (l: LetturaPagina, carta: { carta_id: string; lingua: string } | null) => {
      const id = await salvaLettura(l, carta, salvate.current.get(l.url))
      salvate.current.set(l.url, id)
    }

    const legate = (prodotto: number | null): Voce[] => {
      if (!prodotto) return []
      const a = rif.current
      return [
        ...a.copie.filter((c) => c.cardmarket_id === prodotto).map((x) => ({ tipo: 'copia' as const, x })),
        ...a.wantlist.filter((d) => d.cardmarket_id === prodotto).map((x) => ({ tipo: 'desiderio' as const, x })),
      ]
    }
    const somiglianti = (l: LetturaPagina): Voce[] => {
      const a = rif.current
      return [
        ...a.copie.filter((c) => stessoNome(c.nome, l.nome) && stessoNumero(c.numero, l.numero)).map((x) => ({ tipo: 'copia' as const, x })),
        ...a.wantlist.filter((d) => stessoNome(d.nome, l.nome) && stessoNumero(d.numero, l.numero)).map((x) => ({ tipo: 'desiderio' as const, x })),
      ]
    }
    const dove = (v: Voce[]) => {
      const c = v.filter((x) => x.tipo === 'copia').length
      const d = v.some((x) => x.tipo === 'desiderio')
      return [c ? (c === 1 ? 'la tua copia' : `le tue ${c} copie`) : '', d ? 'la wantlist' : ''].filter(Boolean).join(' e ')
    }

    const barraCollegata = (l: LetturaPagina, v: Voce[], prefisso = 'Letto e salvato'): RispostaBarra => {
      const d = v.find((x) => x.tipo === 'desiderio')?.x as Desiderio | undefined
      if (d) {
        const o = migliorOfferta(l.offerte, { lingua: d.lingua, condizioneMin: d.condizione_min })
        if (o) {
          const sotto = d.prezzo_max != null && o.prezzo! <= d.prezzo_max
          return {
            testo: sotto ? `Offerta sotto il tuo massimo: ${euro(o.prezzo)} (${descriviOfferta(o)})` : `Migliore offerta con i tuoi requisiti: ${euro(o.prezzo)} (${descriviOfferta(o)})`,
            sotto: `${prefisso} per ${dove(v)}. ${sintesi(l)}`,
            colore: sotto ? 'verde' : 'neutro',
            pulsanti: [{ azione: 'apri', etichetta: 'Apri nell\'app' }],
          }
        }
      }
      return { testo: `${prefisso} per ${dove(v)}.`, sotto: sintesi(l), colore: 'verde', pulsanti: [{ azione: 'apri', etichetta: 'Apri nell\'app' }] }
    }

    impostaGestore({
      lettura: async (l) => {
        if (l.prodotto) ultime.current.set(l.prodotto, l)
        const v = legate(l.prodotto)
        if (v.length) {
          await salva(l, { carta_id: v[0].x.carta_id, lingua: v[0].x.lingua })
          return barraCollegata(l, v)
        }
        const s = somiglianti(l)
        if (s.length) {
          const x = s[0].x
          return {
            testo: `Sembra ${s[0].tipo === 'copia' ? 'la tua' : 'la tua carta in wantlist'} ${x.nome} ${x.numero} (${x.set_nome ?? x.set_id}), ma è collegata a un altro prodotto Cardmarket${x.cardmarket_id ? ` (n. ${x.cardmarket_id})` : ''}. La colleghi a questa pagina?`,
            sotto: `${sintesi(l)} · prodotto n. ${l.prodotto ?? '?'}`,
            colore: 'arancio',
            pulsanti: [{ azione: 'collega', etichetta: 'Sì, collega', primario: true }, { azione: 'nuova', etichetta: 'No, è un\'altra carta' }],
          }
        }
        return {
          testo: 'Questa carta non è nella tua collezione né in wantlist.',
          sotto: sintesi(l),
          pulsanti: [
            { azione: 'wantlist', etichetta: 'Wantlist', primario: true },
            { azione: 'collezione', etichetta: 'Collezione' },
            { azione: 'solo', etichetta: 'Solo prezzi' },
            { azione: 'ignora', etichetta: 'Lascia stare' },
          ],
        }
      },

      scelta: async (azione, prodotto) => {
        const l = prodotto ? ultime.current.get(prodotto) : undefined
        if (!l) return { testo: 'Ricarica la pagina e riprova.', colore: 'arancio' }
        const a = rif.current

        if (azione === 'ignora') return { testo: 'Va bene, non salvo nulla.', sotto: sintesi(l) }
        if (azione === 'nuova') {
          return {
            testo: 'Allora questa carta non è nella tua collezione né in wantlist.',
            sotto: sintesi(l),
            pulsanti: [
              { azione: 'wantlist', etichetta: 'Wantlist', primario: true },
              { azione: 'collezione', etichetta: 'Collezione' },
              { azione: 'solo', etichetta: 'Solo prezzi' },
              { azione: 'ignora', etichetta: 'Lascia stare' },
            ],
          }
        }
        if (azione === 'solo') {
          await salva(l, null)
          return { testo: 'Prezzi salvati, senza collegarli a una carta.', sotto: sintesi(l) }
        }
        if (azione === 'apri') {
          const v = legate(prodotto)[0]
          await chiudiBrowser()
          if (v) location.hash = v.tipo === 'copia' ? `#/carta/${v.x.id}` : `#/desiderio/${v.x.id}`
          return null
        }
        if (azione === 'collega') {
          const s = somiglianti(l)
          if (!s.length) return { testo: 'Non trovo più la carta da collegare.', colore: 'arancio' }
          const { carta_id, lingua } = s[0].x
          for (const c of a.copie.filter((x) => x.carta_id === carta_id && x.lingua === lingua)) await aggiornaCopia(c.id, { cardmarket_id: prodotto })
          for (const d of a.wantlist.filter((x) => x.carta_id === carta_id && x.lingua === lingua)) await aggiornaDesiderio(d.id, { cardmarket_id: prodotto })
          await a.ricarica()
          await salva(l, { carta_id, lingua })
          return barraCollegata(l, legate(prodotto).length ? legate(prodotto) : s, 'Collegata ✓ e prezzi salvati')
        }
        if (azione === 'wantlist' || azione === 'collezione' || azione.startsWith('wantlist:') || azione.startsWith('collezione:')) {
          const [cosa, linguaScelta] = azione.split(':') as [string, Lingua | undefined]
          let trovate = await trovaNelCatalogo(l)
          if (linguaScelta) trovate = trovate.filter((t) => t.lingua === linguaScelta)
          const lingue = Array.from(new Set(trovate.map((t) => t.lingua)))
          if (!trovate.length) {
            await chiudiBrowser()
            const q = encodeURIComponent(`${l.nome} ${l.numero}`)
            location.hash = cosa === 'wantlist' ? `#/wantlist/aggiungi?q=${q}` : `#/aggiungi?q=${q}`
            return null
          }
          if (lingue.length > 1) {
            const nomi: Record<string, string> = { en: 'Inglese', it: 'Italiana', ja: 'Giapponese' }
            return {
              testo: 'In che lingua la vuoi?',
              sotto: sintesi(l),
              pulsanti: lingue.map((x) => ({ azione: `${cosa}:${x}`, etichetta: nomi[x] ?? x })),
            }
          }
          const t = trovate[0]
          const set = t.cat.setPerId.get(t.c.setId)
          if (cosa === 'wantlist') {
            const [nuovo] = await nuoviDesideri([{
              carta_id: t.c.id, lingua: t.lingua, nome: t.c.nome, set_id: t.c.setId, set_nome: set?.nome ?? null,
              numero: t.c.numero, immagine: t.c.immagine || null, cardmarket_id: prodotto,
            }])
            await a.ricarica()
            await salva(l, { carta_id: t.c.id, lingua: t.lingua })
            return barraCollegata(l, [{ tipo: 'desiderio', x: nuovo }], 'Aggiunta alla wantlist ✓ e prezzi salvati')
          }
          await salva(l, { carta_id: t.c.id, lingua: t.lingua })
          await chiudiBrowser()
          location.hash = `#/aggiungi?carta=${encodeURIComponent(t.c.id)}&lingua=${t.lingua}&cm=${prodotto}`
          return null
        }
        return null
      },
    })
    return () => impostaGestore(null)
  }, [])

  return null
}

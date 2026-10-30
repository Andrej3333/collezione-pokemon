import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useArchivio } from '../archivio'
import { caricaCatalogo, cartaInLingua, dettaglio, type Catalogo, type CartaCatalogo, type Dettaglio } from '../catalogo'
import { breveLingua, ImmagineCopia, Indietro } from '../comuni'
import { collega, nuovaCopia } from '../dati'
import type { Copia, Lingua } from '../tipi'
import { oggiLocale } from '../tipi'
import { CartaScelta, CercaCarta } from './CercaCarta'
import { FormCopia, soloValori, VALORI_INIZIALI, type ValoriCopia } from './FormCopia'

// Crea una o più copie uguali e le collega alle collezioni scelte; restituisce la prima.
async function creaCopie(dati: Partial<Copia>, quantita: number, collezioni: string[]): Promise<Copia> {
  let prima: Copia | null = null
  for (let i = 0; i < quantita; i++) {
    const copia = await nuovaCopia(dati)
    for (const id of collezioni) await collega(id, copia.id)
    prima = prima ?? copia
  }
  return prima!
}

export function AggiungiCarta() {
  const { copie, ricarica } = useArchivio()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const modello = copie.find((x) => x.id === params.get('da'))
  const [scelta, setScelta] = useState<{ c: CartaCatalogo; lingua: Lingua; cat: Catalogo } | null>(null)
  const [det, setDet] = useState<Dettaglio | null>(null)

  useEffect(() => {
    setDet(null)
    if (scelta) void dettaglio(scelta.lingua, scelta.c.id).then(setDet)
  }, [scelta])

  // arrivo dalla pagina di un set: carta già scelta
  const cartaParam = params.get('carta')
  const linguaParam = params.get('lingua') as Lingua | null
  const cmParam = params.get('cm')
  useEffect(() => {
    if (!cartaParam || !linguaParam) return
    void caricaCatalogo(linguaParam).then((cat) => {
      const c = cat.carte.find((x) => x.id === cartaParam)
      if (c) setScelta({ c, lingua: linguaParam, cat })
    })
  }, [cartaParam, linguaParam])

  if (modello && !scelta) {
    const m = modello
    const iniziali: ValoriCopia = {
      ...soloValori(m), stato: 'collezione', certificato: null, prezzo_pagato: null, data_arrivo: oggiLocale(),
      note: null, prezzo_vendita: null, data_vendita: null,
    }
    return (
      <main className="pagina" style={{ maxWidth: 720 }}>
        <Indietro to={`/carta/${m.id}`}>{m.nome}</Indietro>
        <h1>Un'altra copia</h1>
        <div className="voce">
          <span style={{ width: 52, flex: 'none' }}><ImmagineCopia copia={m} /></span>
          <span className="colonna" style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <span className={`taglia ${m.lingua === 'ja' ? 'jp' : ''}`} style={{ fontWeight: 600 }}>{m.nome}</span>
            <span className="tenue piccolo taglia">{m.set_nome || m.set_id} · {m.numero} · {breveLingua(m.lingua)}</span>
          </span>
        </div>
        <span className="tenue piccolo">Ho ripreso i dati della copia che stavi guardando: cambia quello che è diverso.</span>
        <FormCopia iniziali={iniziali} variantiSuggerite={m.variante ? [m.variante] : []} lingue={m.lingua === 'ja' ? undefined : ['en', 'it']} collezioniIniziali={[]} etichettaSalva="Aggiungi la copia" conQuantita
          onSalva={async (v, collezioni, quantita) => {
            const copia = await creaCopie({
              ...v,
              carta_id: m.carta_id, nome: m.nome, set_id: m.set_id, set_nome: m.set_nome, numero: m.numero,
              rarita: m.rarita, illustratore: m.illustratore, immagine: m.immagine,
              ...(v.lingua !== m.lingua ? await (async () => { const a = await cartaInLingua(m.carta_id, v.lingua); return a ? { nome: a.nome || m.nome, set_nome: a.set_nome ?? m.set_nome, immagine: a.immagine || m.immagine } : {} })() : {}), cardmarket_id: m.cardmarket_id, tcgplayer_id: m.tcgplayer_id,
            }, quantita, collezioni)
            await ricarica()
            navigate(`/carta/${copia.id}`, { replace: true })
          }} />
      </main>
    )
  }

  if (scelta) {
    const { c, lingua, cat } = scelta
    const set = cat.setPerId.get(c.setId)
    return (
      <main className="pagina" style={{ maxWidth: 720 }}>
        <button type="button" className="indietro btn" style={{ border: 0, background: 'transparent', padding: 0, color: 'var(--accento)' }} onClick={() => setScelta(null)}>‹ Torna alla ricerca</button>
        <CartaScelta c={c} lingua={lingua} cat={cat} />
        <FormCopia iniziali={{ ...VALORI_INIZIALI, lingua, variante: det?.varianti[0] ?? null }} key={det ? 'pronto' : 'attesa'}
          lingue={lingua === 'ja' ? undefined : ['en', 'it']}
          variantiSuggerite={det?.varianti ?? []} collezioniIniziali={[]} etichettaSalva="Aggiungi alla collezione" conQuantita
          onSalva={async (v, collezioni, quantita) => {
            const d = det ?? await dettaglio(lingua, c.id)
            // copia in un'altra lingua: nome, set e immagine di quella lingua, se il catalogo li ha
            const altra = v.lingua !== lingua ? await cartaInLingua(c.id, v.lingua) : null
            const copia = await creaCopie({
              ...v,
              carta_id: c.id, lingua: v.lingua, nome: altra?.nome || c.nome, set_id: c.setId,
              set_nome: altra?.set_nome ?? d.setNome ?? set?.nome ?? null, numero: c.numero,
              rarita: d.rarita, illustratore: d.illustratore, immagine: altra?.immagine || c.immagine || d.immagine,
              cardmarket_id: cmParam ? Number(cmParam) : d.cardmarketId, tcgplayer_id: d.tcgplayerId,
            }, quantita, collezioni)
            await ricarica()
            navigate(`/carta/${copia.id}`, { replace: true })
          }} />
      </main>
    )
  }

  return (
    <main className="pagina">
      <Indietro to="/carte">Tutte le carte</Indietro>
      <h1>Aggiungi carta</h1>
      <CercaCarta mostraSet testoIniziale={params.get('q') ?? ''} onScelta={(c, lingua, cat) => setScelta({ c, lingua, cat })} />
    </main>
  )
}

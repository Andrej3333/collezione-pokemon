import { useEffect, useState } from 'react'
import { caricaCatalogo, cerca, type Catalogo, type CartaCatalogo } from '../catalogo'
import { ImmagineCarta } from '../comuni'
import type { Lingua } from '../tipi'
import { LINGUE } from '../tipi'

// Ricerca nel catalogo: lingua, testo, risultati con immagine. Chi la usa decide cosa fare della carta scelta.
export function CercaCarta({ onScelta }: { onScelta: (c: CartaCatalogo, lingua: Lingua, cat: Catalogo) => void }) {
  const [lingua, setLingua] = useState<Lingua>('en')
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [erroreCat, setErroreCat] = useState<string | null>(null)
  const [testo, setTesto] = useState('')
  const [risultati, setRisultati] = useState<CartaCatalogo[]>([])

  useEffect(() => {
    setCatalogo(null)
    setErroreCat(null)
    caricaCatalogo(lingua).then(setCatalogo, (e) => setErroreCat((e as Error).message))
  }, [lingua])

  useEffect(() => {
    if (!catalogo) return
    const t = setTimeout(() => setRisultati(cerca(catalogo, testo)), 150)
    return () => clearTimeout(t)
  }, [catalogo, testo])

  return (
    <>
      <div className="chips" role="group" aria-label="Lingua della carta">
        {LINGUE.map((l) => (
          <button key={l.id} type="button" className={`chip ${lingua === l.id ? 'attivo' : ''}`} aria-pressed={lingua === l.id} onClick={() => setLingua(l.id)}>{l.nome}</button>
        ))}
      </div>
      <input className="campo-libero" type="search" autoFocus aria-label="Cerca nel catalogo"
        placeholder={lingua === 'ja' ? 'Nome giapponese, numero o set (es. SV2a 201)' : 'Nome, numero o set (es. Sylveon RC32)'}
        value={testo} onChange={(e) => setTesto(e.target.value)} />
      {erroreCat && <div className="avviso errore">Catalogo non disponibile: {erroreCat}</div>}
      {!catalogo && !erroreCat && <div className="vuoto">Caricamento del catalogo…</div>}
      {catalogo && testo.trim() === '' && (
        <div className="avviso">Cerca per nome, numero o set. Per le carte giapponesi puoi usare il codice del set e il numero, per esempio <b>SV2a 201</b>.</div>
      )}
      {catalogo && testo.trim() !== '' && risultati.length === 0 && <div className="vuoto">Nessuna carta trovata.</div>}
      <div className="griglia-carte fitta">
        {catalogo && risultati.map((c) => {
          const set = catalogo.setPerId.get(c.setId)
          return (
            <button key={c.id} type="button" className="carta" onClick={() => onScelta(c, lingua, catalogo)}>
              <ImmagineCarta immagine={c.immagine} lingua={lingua} setId={c.setId} numero={c.numero} alt={c.nome} />
              <span className={`nome taglia piccolo ${lingua === 'ja' ? 'jp' : ''}`}>{c.nome}</span>
              <span className="tenue piccolo taglia">{c.numero} · {set?.nome ?? c.setId}</span>
            </button>
          )
        })}
      </div>
      {risultati.length >= 60 && <div className="tenue piccolo">Mostro i primi 60 risultati: aggiungi parole per restringere.</div>}
    </>
  )
}

// Intestazione con immagine e dati della carta scelta.
export function CartaScelta({ c, lingua, cat }: { c: CartaCatalogo; lingua: Lingua; cat: Catalogo }) {
  const set = cat.setPerId.get(c.setId)
  return (
    <div className="riga" style={{ alignItems: 'flex-start' }}>
      <div style={{ width: 110, flex: 'none' }}>
        <ImmagineCarta immagine={c.immagine} lingua={lingua} setId={c.setId} numero={c.numero} alt={c.nome} />
      </div>
      <div className="colonna" style={{ gap: 4 }}>
        <h1 className={lingua === 'ja' ? 'jp' : ''} style={{ fontSize: 22 }}>{c.nome}</h1>
        <span className="tenue">{set?.nome ?? c.setId} · {c.numero}{set?.totale && /^\d+$/.test(c.numero) ? `/${set.totale}` : ''}</span>
        <span className="tenue">{LINGUE.find((l) => l.id === lingua)?.nome}</span>
      </div>
    </div>
  )
}

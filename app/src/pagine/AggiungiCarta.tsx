import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useArchivio } from '../archivio'
import { caricaCatalogo, cerca, dettaglio, type Catalogo, type CartaCatalogo } from '../catalogo'
import { ImmagineCarta, Indietro } from '../comuni'
import { collega, nuovaCopia } from '../dati'
import type { Lingua } from '../tipi'
import { LINGUE } from '../tipi'
import { FormCopia, VALORI_INIZIALI } from './FormCopia'

export function AggiungiCarta() {
  const { ricarica } = useArchivio()
  const navigate = useNavigate()
  const [lingua, setLingua] = useState<Lingua>('en')
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [erroreCat, setErroreCat] = useState<string | null>(null)
  const [testo, setTesto] = useState('')
  const [risultati, setRisultati] = useState<CartaCatalogo[]>([])
  const [scelta, setScelta] = useState<CartaCatalogo | null>(null)

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

  if (scelta && catalogo) {
    const set = catalogo.setPerId.get(scelta.setId)
    return (
      <main className="pagina" style={{ maxWidth: 720 }}>
        <button type="button" className="indietro btn" style={{ border: 0, background: 'transparent', padding: 0, color: 'var(--accento)' }} onClick={() => setScelta(null)}>‹ Torna alla ricerca</button>
        <div className="riga" style={{ alignItems: 'flex-start' }}>
          <div style={{ width: 110, flex: 'none' }}>
            <ImmagineCarta immagine={scelta.immagine} lingua={lingua} setId={scelta.setId} numero={scelta.numero} alt={scelta.nome} />
          </div>
          <div className="colonna" style={{ gap: 4 }}>
            <h1 className={lingua === 'ja' ? 'jp' : ''} style={{ fontSize: 22 }}>{scelta.nome}</h1>
            <span className="tenue">{set?.nome ?? scelta.setId} · {scelta.numero}{set?.totale && /^\d+$/.test(scelta.numero) ? `/${set.totale}` : ''}</span>
            <span className="tenue">{LINGUE.find((l) => l.id === lingua)?.nome}</span>
          </div>
        </div>
        <FormCopia iniziali={VALORI_INIZIALI} collezioniIniziali={[]} etichettaSalva="Aggiungi alla collezione"
          onSalva={async (v, collezioni) => {
            const d = await dettaglio(lingua, scelta.id)
            const copia = await nuovaCopia({
              ...v,
              carta_id: scelta.id, lingua, nome: scelta.nome, set_id: scelta.setId,
              set_nome: d.setNome ?? set?.nome ?? null, numero: scelta.numero,
              rarita: d.rarita, illustratore: d.illustratore, immagine: scelta.immagine || d.immagine,
              cardmarket_id: d.cardmarketId,
            })
            for (const id of collezioni) await collega(id, copia.id)
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
        {risultati.map((c) => {
          const set = catalogo?.setPerId.get(c.setId)
          return (
            <button key={c.id} type="button" className="carta" onClick={() => setScelta(c)}>
              <ImmagineCarta immagine={c.immagine} lingua={lingua} setId={c.setId} numero={c.numero} alt={c.nome} />
              <span className={`nome taglia piccolo ${lingua === 'ja' ? 'jp' : ''}`}>{c.nome}</span>
              <span className="tenue piccolo taglia">{c.numero} · {set?.nome ?? c.setId}</span>
            </button>
          )
        })}
      </div>
      {risultati.length >= 60 && <div className="tenue piccolo">Mostro i primi 60 risultati: aggiungi parole per restringere.</div>}
    </main>
  )
}

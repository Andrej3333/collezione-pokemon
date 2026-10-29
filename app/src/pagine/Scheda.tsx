import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { copieDi, useArchivio } from '../archivio'
import { Attesa, EtichettaStato, ImmagineCopia, Indietro } from '../comuni'
import { aggiornaCopia, caricaFoto, collega, eliminaCopia, scollega } from '../dati'
import { CONDIZIONI, LINGUE } from '../tipi'
import { FormCopia, soloValori } from './FormCopia'

function indirizzoBulbapedia(nome: string, setNome: string | null, numero: string): string {
  const q = `${nome} (${setNome ?? ''} ${numero})`.replace(/\s+/g, ' ')
  return `https://bulbapedia.bulbagarden.net/wiki/Special:Search?search=${encodeURIComponent(q)}`
}

export function Scheda() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { copie, collezioni, legami, posizioni, caricato, ricarica } = useArchivio()
  const [modifica, setModifica] = useState(false)
  const [grande, setGrande] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [occupato, setOccupato] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => { setModifica(false) }, [id])

  if (!caricato) return <main className="pagina"><Attesa /></main>
  const c = copie.find((x) => x.id === id)
  if (!c) return <main className="pagina"><Indietro to="/carte">Tutte le carte</Indietro><div className="vuoto">Carta non trovata.</div></main>

  const manualiDi = legami.filter((l) => l.copia_id === c.id).map((l) => l.collezione_id)
  const contenitori = collezioni.filter((col) => copieDi(col, [c], legami).length > 0)
  const manuali = collezioni.filter((col) => col.tipo === 'manuale')
  const posizione = posizioni.find((p) => p.id === c.posizione_id)
  const lingua = LINGUE.find((l) => l.id === c.lingua)?.nome

  async function esegui(f: () => Promise<unknown>) {
    setOccupato(true)
    setErrore(null)
    try { await f(); await ricarica() } catch (e) { setErrore((e as Error).message) }
    setOccupato(false)
  }

  if (modifica) {
    return (
      <main className="pagina" style={{ maxWidth: 720 }}>
        <button type="button" className="indietro btn" style={{ border: 0, background: 'transparent', padding: 0, color: 'var(--accento)' }} onClick={() => setModifica(false)}>‹ Annulla</button>
        <h1>Modifica: {c.nome}</h1>
        <FormCopia iniziali={soloValori(c)} collezioniIniziali={manualiDi} etichettaSalva="Salva le modifiche"
          onSalva={async (v, scelte) => {
            await aggiornaCopia(c.id, v)
            for (const col of manuali) {
              const era = manualiDi.includes(col.id)
              const ora = scelte.includes(col.id)
              if (ora && !era) await collega(col.id, c.id)
              if (!ora && era) await scollega(col.id, c.id)
            }
            await ricarica()
            setModifica(false)
          }} />
      </main>
    )
  }

  return (
    <main className="pagina">
      <Indietro to="/carte">Tutte le carte</Indietro>
      <div className="riga a-capo" style={{ alignItems: 'flex-start', gap: 24 }}>
        <div className="colonna" style={{ flex: '1 1 240px', maxWidth: 320, margin: '0 auto', gap: 10 }}>
          <ImmagineCopia copia={c} grande />
          <div className="riga" style={{ gap: 8 }}>
            <button type="button" className="btn" style={{ flex: 1, minWidth: 0 }} disabled={occupato} onClick={() => fileRef.current?.click()}>La tua foto</button>
            <button type="button" className="btn" style={{ flex: 1, minWidth: 0 }} onClick={() => setGrande(true)}>Ingrandisci</button>
            <a className="btn icona" href={indirizzoBulbapedia(c.nome, c.set_nome, c.numero)} target="_blank" rel="noreferrer"
              aria-label="Apri la pagina della carta su Bulbapedia" title="Bulbapedia">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinejoin="round" /><path d="M9 8h7M9 11.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            </a>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void esegui(() => caricaFoto(c.id, f)); e.target.value = '' }} />
        </div>

        <div className="colonna" style={{ flex: '999 1 340px', gap: 16 }}>
          <div className="colonna" style={{ gap: 6 }}>
            <EtichettaStato stato={c.stato} />
            <h1 className={c.lingua === 'ja' ? 'jp' : ''} style={{ fontSize: 26 }}>{c.nome}</h1>
            <span className="tenue" style={{ lineHeight: 1.5 }}>
              {[c.set_nome || c.set_id, c.numero, c.rarita, lingua].filter(Boolean).join(' · ')}
            </span>
          </div>
          {errore && <div className="avviso errore">{errore}</div>}
          <div className="griglia-campi">
            <button type="button" className="btn primario" onClick={() => setModifica(true)}>Modifica</button>
            <label className="campo" style={{ gap: 0 }}>
              <select aria-label="Cambia stato" value={c.stato} disabled={occupato}
                onChange={(e) => void esegui(() => aggiornaCopia(c.id, { stato: e.target.value as typeof c.stato }))}>
                <option value="collezione">Stato: in collezione</option>
                <option value="viaggio">Stato: in viaggio</option>
                <option value="venduta">Stato: venduta</option>
              </select>
            </label>
          </div>

          <section className="scheda">
            <h2>Nelle collezioni</h2>
            <div className="riga a-capo" style={{ gap: 8 }}>
              {contenitori.length === 0 && <span className="tenue piccolo">Non è ancora in nessuna collezione.</span>}
              {contenitori.map((col) => (
                <Link key={col.id} to={`/collezione/${col.id}`} className={`etichetta ${col.tipo === 'set' ? 'blu' : col.tipo === 'automatica' ? 'verde' : ''}`}
                  style={{ fontSize: 14, padding: '8px 12px', borderRadius: 18 }}>{col.nome}</Link>
              ))}
            </div>
            {manuali.length > 0 && (
              <div className="riga a-capo" style={{ gap: 8 }}>
                {manuali.filter((col) => !manualiDi.includes(col.id)).map((col) => (
                  <button key={col.id} type="button" className="chip" disabled={occupato}
                    onClick={() => void esegui(() => collega(col.id, c.id))}>+ {col.nome}</button>
                ))}
              </div>
            )}
          </section>

          <section className="scheda">
            <h2>Valore della carta</h2>
            <div className="avviso">Prezzi e andamento arrivano con la tappa 3.{c.cardmarket_id ? ` Prodotto Cardmarket già collegato (${c.cardmarket_id}).` : ''}</div>
          </section>

          <section className="scheda">
            <h2>La tua copia</h2>
            <div className="dati">
              <div><div className="lbl">Condizione</div>{CONDIZIONI.find((x) => x.id === c.condizione)?.nome ?? c.condizione}</div>
              <div><div className="lbl">Gradata</div>{c.gradata ? [c.ente, c.voto].filter(Boolean).join(' ') || 'Sì' : 'No'}</div>
              {c.gradata && c.certificato && <div><div className="lbl">Certificato</div>{c.certificato}</div>}
              <div><div className="lbl">Protezione</div>{c.protezione || 'Non indicata'}</div>
              <div><div className="lbl">Posizione</div>{posizione ? `${posizione.nome}${c.pagina ? `, ${c.pagina}` : ''}` : 'Nessuna'}</div>
              <div><div className="lbl">Pagata</div><span className="mono">{c.prezzo_pagato != null ? `€ ${c.prezzo_pagato.toFixed(2).replace('.', ',')}` : 'Non indicato'}</span></div>
              <div><div className="lbl">Arrivata il</div>{c.data_arrivo ? new Date(c.data_arrivo).toLocaleDateString('it-IT') : 'Non indicato'}</div>
              {c.illustratore && <div><div className="lbl">Illustratore</div>{c.illustratore}</div>}
            </div>
            {c.note && <div style={{ whiteSpace: 'pre-line' }}>{c.note}</div>}
          </section>

          <button type="button" className="btn pericolo" disabled={occupato}
            onClick={() => { if (window.confirm(`Eliminare ${c.nome} dalla collezione?`)) void esegui(async () => { await eliminaCopia(c.id); navigate('/carte', { replace: true }) }) }}>
            Elimina questa copia
          </button>
        </div>
      </div>

      {grande && (
        <div className="foglio-sfondo" onClick={() => setGrande(false)} role="dialog" aria-label="Immagine ingrandita">
          <div style={{ width: 'min(92vw, 480px)', margin: 'auto' }}><ImmagineCopia copia={c} grande /></div>
        </div>
      )}
    </main>
  )
}

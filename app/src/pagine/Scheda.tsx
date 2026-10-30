import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { copieDi, useArchivio } from '../archivio'
import { Attesa, EtichettaStato, ImmagineCopia, Indietro } from '../comuni'
import { aggiornaCopia, caricaFoto, collega, eliminaCopia, scollega } from '../dati'
import { CONDIZIONI, LINGUE, oggiLocale } from '../tipi'
import { cartaInLingua } from '../catalogo'
import { breveLingua } from '../comuni'
import { FormCopia, soloValori } from './FormCopia'
import { ValoreCarta } from './Valore'
import { LettureCardmarket } from './Letture'
import { LinkSiti } from './Wantlist'

function indirizzoBulbapedia(nome: string, setNome: string | null, numero: string): string {
  const q = `${nome} (${setNome ?? ''} ${numero})`.replace(/\s+/g, ' ')
  return `https://bulbapedia.bulbagarden.net/wiki/Special:Search?search=${encodeURIComponent(q)}`
}

export function Scheda() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { copie, collezioni, legami, posizioni, ordini, caricato, ricarica } = useArchivio()
  const [modifica, setModifica] = useState(false)
  const [grande, setGrande] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [occupato, setOccupato] = useState(false)
  const [vendita, setVendita] = useState<{ prezzo: string; data: string } | null>(null)
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
  const ordine = ordini.find((o) => o.id === c.ordine_id)
  const euro = (n: number | null) => `€ ${Number(n || 0).toFixed(2).replace('.', ',')}`

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
          lingue={c.lingua === 'ja' ? undefined : ['en', 'it']}
          onSalva={async (v, scelte) => {
            const altra = v.lingua !== c.lingua ? await cartaInLingua(c.carta_id, v.lingua) : null
            await aggiornaCopia(c.id, { ...v, ...(altra ? { nome: altra.nome || c.nome, set_nome: altra.set_nome ?? c.set_nome, immagine: altra.immagine || c.immagine } : {}) })
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
      {c.stato === 'venduta' ? <Indietro to="/vendute">Vendute</Indietro> : <Indietro to="/carte">Tutte le carte</Indietro>}
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
              <Link to={`/set/${c.lingua}/${encodeURIComponent(c.set_id)}`}>{c.set_nome || c.set_id}</Link>
              {' · '}{[c.numero, c.rarita, lingua, c.variante].filter(Boolean).join(' · ')}
            </span>
          </div>
          {errore && <div className="avviso errore">{errore}</div>}
          <div className="griglia-campi">
            <button type="button" className="btn primario" onClick={() => setModifica(true)}>Modifica</button>
            <label className="campo" style={{ gap: 0 }}>
              <select aria-label="Cambia stato" value={c.stato} disabled={occupato}
                onChange={(e) => {
                  const s = e.target.value as typeof c.stato
                  if (s === 'venduta') setVendita({ prezzo: '', data: oggiLocale() })
                  else void esegui(() => aggiornaCopia(c.id, { stato: s }))
                }}>
                <option value="collezione">Stato: in collezione</option>
                <option value="viaggio">Stato: in viaggio</option>
                <option value="venduta">Stato: venduta</option>
              </select>
            </label>
          </div>

          <ValoreCarta cm={c.cardmarket_id} tp={c.tcgplayer_id} variante={c.variante} lingua={c.lingua} nome={c.nome} numero={c.numero} setId={c.set_id}
            costo={c.prezzo_pagato != null ? Number(c.prezzo_pagato) + Number(c.quota_spese || 0) : null}
            vendita={c.stato === 'venduta' ? { prezzo: c.prezzo_vendita != null ? Number(c.prezzo_vendita) : null, data: c.data_vendita } : null}
            onTcgplayer={(tp) => esegui(() => aggiornaCopia(c.id, { tcgplayer_id: tp }))} />

          {(() => {
            const altre = copie.filter((x) => x.carta_id === c.carta_id && x.lingua === c.lingua)
            return (
              <section className="scheda">
                <h2>Le tue copie di questa carta{altre.length > 1 ? ` (${altre.length})` : ''}</h2>
                {altre.length > 1 && altre.map((x) => (
                  <Link key={x.id} to={`/carta/${x.id}`} className="riga tra" style={{ gap: 10, color: 'var(--testo)', padding: '8px 10px', borderRadius: 8, border: `1px solid ${x.id === c.id ? 'var(--accento)' : 'var(--bordo)'}` }}>
                    <span className="colonna" style={{ gap: 2, minWidth: 0 }}>
                      <span className="taglia" style={{ fontWeight: x.id === c.id ? 600 : 400 }}>
                        {[x.variante, x.gradata ? `${x.ente ?? ''} ${x.voto ?? ''}`.trim() || 'Gradata' : CONDIZIONI.find((k) => k.id === x.condizione)?.nome ?? x.condizione].filter(Boolean).join(' · ')}
                      </span>
                      <span className="tenue piccolo taglia">
                        {x.stato === 'venduta' ? `venduta${x.prezzo_vendita != null ? ` a ${euro(Number(x.prezzo_vendita))}` : ''}` : x.stato === 'viaggio' ? 'in viaggio' : posizioni.find((p) => p.id === x.posizione_id)?.nome ?? 'senza posizione'}
                        {x.prezzo_pagato != null ? ` · pagata ${euro(x.prezzo_pagato)}` : ''}
                      </span>
                    </span>
                    {x.id === c.id ? <span className="etichetta blu">Questa</span> : <span className="tenue" aria-hidden="true">›</span>}
                  </Link>
                ))}
                {altre.length === 1 && <span className="tenue piccolo">Hai una sola copia di questa carta ({breveLingua(c.lingua)}).</span>}
                <Link className="btn contorno" to={`/aggiungi?da=${c.id}`}>Aggiungi un'altra copia</Link>
              </section>
            )
          })()}

          {c.stato !== 'venduta' && <section className="scheda">
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
          </section>}

          <LettureCardmarket cm={c.cardmarket_id} carta={c} condizione={c.gradata ? null : c.condizione} />

          <section className="scheda">
            <h2>Valuta la tua copia sui siti</h2>
            <LinkSiti c={c} />
          </section>

          <section className="scheda">
            <h2>La tua copia</h2>
            <div className="dati">
              <div><div className="lbl">Condizione</div>{CONDIZIONI.find((x) => x.id === c.condizione)?.nome ?? c.condizione}</div>
              <div><div className="lbl">Gradata</div>{c.gradata ? [c.ente, c.voto].filter(Boolean).join(' ') || 'Sì' : 'No'}</div>
              {c.gradata && c.certificato && <div><div className="lbl">Certificato</div>{c.certificato}</div>}
              <div><div className="lbl">Protezione</div>{c.protezione || 'Non indicata'}</div>
              <div><div className="lbl">Posizione</div>{posizione ? `${posizione.nome}${c.pagina ? `, ${c.pagina}` : ''}` : 'Nessuna'}</div>
              <div><div className="lbl">Variante</div>{c.variante || 'Non indicata'}</div>
              <div><div className="lbl">Pagata</div><span className="mono">{c.prezzo_pagato != null ? euro(c.prezzo_pagato) : 'Non indicato'}</span></div>
              {c.quota_spese != null && Number(c.quota_spese) > 0 && <div><div className="lbl">Quota spese dell'ordine</div><span className="mono">{euro(c.quota_spese)}</span></div>}
              {c.quota_spese != null && Number(c.quota_spese) > 0 && <div><div className="lbl">Costo effettivo</div><span className="mono" style={{ fontWeight: 600 }}>{euro(Number(c.prezzo_pagato || 0) + Number(c.quota_spese))}</span></div>}
              {ordine && <div><div className="lbl">Ordine</div><Link to={`/ordine/${ordine.id}`}>{ordine.sito}, {new Date(ordine.data).toLocaleDateString('it-IT')}</Link></div>}
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

      {vendita && (
        <div className="foglio-sfondo" onClick={() => setVendita(null)}>
          <form className="foglio" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Segna come venduta"
            onSubmit={(e) => {
              e.preventDefault()
              const v = vendita
              setVendita(null)
              void esegui(() => aggiornaCopia(c.id, { stato: 'venduta', prezzo_vendita: v.prezzo === '' ? null : Number(v.prezzo), data_vendita: v.data || null }))
            }}>
            <h2>Segna come venduta</h2>
            <span className="tenue piccolo">La carta passa nella sezione Vendute e il suo prezzo continua a essere seguito.</span>
            <div className="griglia-campi">
              <label className="campo">Venduta a (€)
                <input type="number" inputMode="decimal" step="0.01" min="0" autoFocus value={vendita.prezzo} onChange={(e) => setVendita({ ...vendita, prezzo: e.target.value })} />
              </label>
              <label className="campo">Venduta il
                <input type="date" value={vendita.data} onChange={(e) => setVendita({ ...vendita, data: e.target.value })} />
              </label>
            </div>
            <div className="griglia-campi">
              <button type="button" className="btn" onClick={() => setVendita(null)}>Annulla</button>
              <button type="submit" className="btn primario">Segna come venduta</button>
            </div>
          </form>
        </div>
      )}

      {grande && (
        <div className="foglio-sfondo" onClick={() => setGrande(false)} role="dialog" aria-label="Immagine ingrandita">
          <div style={{ width: 'min(92vw, 480px)', margin: 'auto' }}><ImmagineCopia copia={c} grande /></div>
        </div>
      )}
    </main>
  )
}

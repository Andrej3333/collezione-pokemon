import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useArchivio } from '../archivio'
import { dettaglio, type Catalogo, type CartaCatalogo, type Dettaglio } from '../catalogo'
import { Attesa, breveLingua, ImmagineCarta, Indietro } from '../comuni'
import { aggiornaDesiderio, eliminaDesiderio, nuoviDesideri } from '../dati'
import { linkRicerca } from '../ricerca'
import type { Desiderio, Lingua } from '../tipi'
import { CONDIZIONI } from '../tipi'
import { CartaScelta, CercaCarta } from './CercaCarta'
import { CampoVariante } from './FormCopia'

export function requisiti(d: Desiderio): string {
  return [
    d.variante,
    d.condizione_min && `almeno ${CONDIZIONI.find((c) => c.id === d.condizione_min)?.nome ?? d.condizione_min}`,
    d.gradata === 'si' ? 'gradata' : d.gradata === 'no' ? 'non gradata' : null,
    d.prezzo_max != null && `max € ${Number(d.prezzo_max).toFixed(2).replace('.', ',')}`,
  ].filter(Boolean).join(' · ')
}

function ImmagineDesiderio({ d, grande }: { d: Desiderio; grande?: boolean }) {
  return <ImmagineCarta immagine={d.immagine} lingua={d.lingua} setId={d.set_id} numero={d.numero} grande={grande} alt={d.nome} />
}

export function Wantlist() {
  const { wantlist, caricato } = useArchivio()
  if (!caricato) return <main className="pagina"><Attesa /></main>
  return (
    <main className="pagina" style={{ maxWidth: 900 }}>
      <div className="riga tra">
        <h1>Wantlist</h1>
        <Link className="btn primario" to="/wantlist/aggiungi">Aggiungi</Link>
      </div>
      <span className="tenue" style={{ lineHeight: 1.5 }}>Tocca una carta per cercarla sui siti o per aggiungerla a un ordine.</span>
      {wantlist.length === 0 && (
        <div className="vuoto">La wantlist è vuota.<br />Aggiungi una carta da qui, oppure le mancanti da una collezione di set.</div>
      )}
      <div className="colonna" style={{ gap: 8 }}>
        {wantlist.map((d) => (
          <Link key={d.id} to={`/desiderio/${d.id}`} className="voce" style={{ gap: 12 }}>
            <span style={{ width: 52, flex: 'none' }}><ImmagineDesiderio d={d} /></span>
            <span className="colonna" style={{ flex: 1, gap: 2 }}>
              <span className={`taglia ${d.lingua === 'ja' ? 'jp' : ''}`} style={{ fontWeight: 600 }}>{d.nome}</span>
              <span className="tenue piccolo taglia">{d.set_nome || d.set_id} · {d.numero} · {breveLingua(d.lingua)}</span>
              {requisiti(d) && <span className="piccolo taglia" style={{ color: 'var(--testo2)' }}>{requisiti(d)}</span>}
            </span>
            {d.ordine_id ? <span className="etichetta arancio">In viaggio</span> : <span className="tenue" aria-hidden="true">›</span>}
          </Link>
        ))}
      </div>
    </main>
  )
}

interface Requisiti { variante: string | null; condizione_min: string | null; gradata: '' | 'si' | 'no'; prezzo_max: number | null; note: string | null }

function FormRequisiti({ iniziali, suggerite, etichetta, onSalva }: {
  iniziali: Requisiti; suggerite: string[]; etichetta: string; onSalva: (r: Requisiti) => Promise<void>
}) {
  const [r, setR] = useState(iniziali)
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  return (
    <form className="colonna" style={{ gap: 14 }} onSubmit={async (e) => {
      e.preventDefault(); setInvio(true); setErrore(null)
      try { await onSalva(r) } catch (err) { setErrore((err as Error).message); setInvio(false) }
    }}>
      <CampoVariante valore={r.variante} suggerite={suggerite} onCambia={(v) => setR({ ...r, variante: v })} />
      <div className="griglia-campi">
        <label className="campo">Condizione minima
          <select value={r.condizione_min ?? ''} onChange={(e) => setR({ ...r, condizione_min: e.target.value || null })}>
            <option value="">Qualsiasi</option>
            {CONDIZIONI.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
        <label className="campo">Gradata
          <select value={r.gradata} onChange={(e) => setR({ ...r, gradata: e.target.value as Requisiti['gradata'] })}>
            <option value="">Indifferente</option>
            <option value="si">Solo gradata</option>
            <option value="no">Solo non gradata</option>
          </select>
        </label>
        <label className="campo">Prezzo massimo (€)
          <input type="number" inputMode="decimal" step="0.01" min="0" value={r.prezzo_max ?? ''}
            onChange={(e) => setR({ ...r, prezzo_max: e.target.value === '' ? null : Number(e.target.value) })} />
        </label>
      </div>
      <label className="campo">Note<textarea value={r.note ?? ''} onChange={(e) => setR({ ...r, note: e.target.value || null })} /></label>
      {errore && <div className="avviso errore">{errore}</div>}
      <button className="btn primario" type="submit" disabled={invio}>{invio ? 'Salvataggio…' : etichetta}</button>
    </form>
  )
}

export function NuovoDesiderio() {
  const { ricarica } = useArchivio()
  const navigate = useNavigate()
  const [scelta, setScelta] = useState<{ c: CartaCatalogo; lingua: Lingua; cat: Catalogo } | null>(null)
  const [det, setDet] = useState<Dettaglio | null>(null)
  useEffect(() => { setDet(null); if (scelta) void dettaglio(scelta.lingua, scelta.c.id).then(setDet) }, [scelta])

  if (scelta) {
    const { c, lingua, cat } = scelta
    return (
      <main className="pagina" style={{ maxWidth: 720 }}>
        <button type="button" className="indietro btn" style={{ border: 0, background: 'transparent', padding: 0, color: 'var(--accento)' }} onClick={() => setScelta(null)}>‹ Torna alla ricerca</button>
        <CartaScelta c={c} lingua={lingua} cat={cat} />
        <FormRequisiti key={det ? 'p' : 'a'} iniziali={{ variante: null, condizione_min: null, gradata: '', prezzo_max: null, note: null }}
          suggerite={det?.varianti ?? []} etichetta="Aggiungi alla wantlist"
          onSalva={async (r) => {
            const d = det ?? await dettaglio(lingua, c.id)
            await nuoviDesideri([{
              ...r, carta_id: c.id, lingua, nome: c.nome, set_id: c.setId,
              set_nome: d.setNome ?? cat.setPerId.get(c.setId)?.nome ?? null, numero: c.numero,
              immagine: c.immagine || d.immagine, cardmarket_id: d.cardmarketId,
            }])
            await ricarica()
            navigate('/wantlist', { replace: true })
          }} />
      </main>
    )
  }
  return (
    <main className="pagina">
      <Indietro to="/wantlist">Wantlist</Indietro>
      <h1>Aggiungi alla wantlist</h1>
      <CercaCarta onScelta={(c, lingua, cat) => setScelta({ c, lingua, cat })} />
    </main>
  )
}

export function LinkSiti({ c }: { c: Parameters<typeof linkRicerca>[0] }) {
  return (
    <div className="colonna" style={{ gap: 8 }}>
      <div className="griglia-campi">
        {linkRicerca(c).map((l) => (
          <a key={l.sito} className="btn" href={l.url} target="_blank" rel="noreferrer" style={{ flexDirection: 'column', gap: 0, padding: '6px 12px' }}>
            <span>Cerca su {l.sito}</span>
            {l.nota && <span className="tenue" style={{ fontSize: 12 }}>{l.nota}</span>}
          </a>
        ))}
      </div>
      <span className="tenue piccolo" style={{ lineHeight: 1.5 }}>Per ora la ricerca si apre nel browser normale. Con il browser interno (tappa 4) l'app leggerà da sola le offerte.</span>
    </div>
  )
}

export function DesiderioVista() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { wantlist, ordini, caricato, ricarica } = useArchivio()
  const [modifica, setModifica] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  if (!caricato) return <main className="pagina"><Attesa /></main>
  const d = wantlist.find((x) => x.id === id)
  if (!d) return <main className="pagina"><Indietro to="/wantlist">Wantlist</Indietro><div className="vuoto">Carta non trovata nella wantlist.</div></main>
  const ordine = ordini.find((o) => o.id === d.ordine_id)

  if (modifica) {
    return (
      <main className="pagina" style={{ maxWidth: 720 }}>
        <button type="button" className="indietro btn" style={{ border: 0, background: 'transparent', padding: 0, color: 'var(--accento)' }} onClick={() => setModifica(false)}>‹ Annulla</button>
        <h1>Modifica: {d.nome}</h1>
        <FormRequisiti iniziali={{ variante: d.variante, condizione_min: d.condizione_min, gradata: d.gradata, prezzo_max: d.prezzo_max, note: d.note }} suggerite={[]} etichetta="Salva" onSalva={async (r) => { await aggiornaDesiderio(d.id, r); await ricarica(); setModifica(false) }} />
      </main>
    )
  }

  return (
    <main className="pagina">
      <Indietro to="/wantlist">Wantlist</Indietro>
      <div className="riga a-capo" style={{ alignItems: 'flex-start', gap: 24 }}>
        <div style={{ flex: '1 1 200px', maxWidth: 280, margin: '0 auto' }}><ImmagineDesiderio d={d} grande /></div>
        <div className="colonna" style={{ flex: '999 1 320px', gap: 16 }}>
          <div className="colonna" style={{ gap: 6 }}>
            {ordine && <span className="etichetta arancio">In viaggio</span>}
            <h1 className={d.lingua === 'ja' ? 'jp' : ''} style={{ fontSize: 26 }}>{d.nome}</h1>
            <span className="tenue">{[d.set_nome || d.set_id, d.numero, breveLingua(d.lingua)].join(' · ')}</span>
            {requisiti(d) && <span style={{ color: 'var(--testo2)' }}>Cerchi: {requisiti(d)}</span>}
            {d.note && <span className="tenue" style={{ whiteSpace: 'pre-line' }}>{d.note}</span>}
          </div>
          {errore && <div className="avviso errore">{errore}</div>}

          <section className="scheda">
            <h2>Cerca sui siti</h2>
            <LinkSiti c={d} />
          </section>

          {ordine ? (
            <Link className="btn contorno" to={`/ordine/${ordine.id}`}>Vedi l'ordine: {ordine.sito}, {new Date(ordine.data).toLocaleDateString('it-IT')}</Link>
          ) : (
            <Link className="btn primario" to={`/ordine/nuovo?da=${d.id}`}>L'ho comprata: crea l'ordine</Link>
          )}
          <div className="griglia-campi">
            <button type="button" className="btn" onClick={() => setModifica(true)}>Modifica</button>
            <button type="button" className="btn pericolo" onClick={async () => {
              if (!window.confirm(`Togliere ${d.nome} dalla wantlist?`)) return
              try { await eliminaDesiderio(d.id); await ricarica(); navigate('/wantlist', { replace: true }) } catch (e) { setErrore((e as Error).message) }
            }}>Togli dalla wantlist</button>
          </div>
        </div>
      </div>
    </main>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useArchivio } from '../archivio'
import { dettaglio, type Catalogo, type CartaCatalogo } from '../catalogo'
import { Attesa, breveLingua, ImmagineCarta, ImmagineCopia, Indietro } from '../comuni'
import {
  aggiornaCopia, aggiornaDesiderio, aggiornaOrdine, calcolaQuote, eliminaCopia, eliminaDesiderio,
  eliminaOrdine, nuovaCopia, nuovoOrdine, salvaQuote, speseOrdine, valoreMerce,
} from '../dati'
import { costiEffettivi, stimaImportazione } from '../importazione'
import type { CategoriaVoce, Copia, Desiderio, Lingua, Ordine, TipoOrdine } from '../tipi'
import { CONDIZIONI, TAPPE } from '../tipi'
import { CercaCarta } from './CercaCarta'

const euro = (n: number | null | undefined) => `€ ${Number(n || 0).toFixed(2).replace('.', ',')}`
const CORRIERI = ['Japan Post EMS', 'Japan Post aerea', 'Japan Post SAL', 'DHL', 'FedEx', 'UPS']
const SITI = ['Cardmarket', 'eBay', 'Mercari', 'Yahoo Aste', 'SNKRDUNK', 'Card Rush', 'Toreca Camp', 'Suruga-ya', 'Fiera', 'Negozio']

// --- Elenco: In viaggio ---------------------------------------------------------

export function Viaggio() {
  const { ordini, copie, voci, caricato } = useArchivio()
  const [storico, setStorico] = useState(false)
  if (!caricato) return <main className="pagina"><Attesa /></main>
  const aperti = ordini.filter((o) => !o.arrivato)
  const arrivati = ordini.filter((o) => o.arrivato)

  const scheda = (o: Ordine) => {
    const carte = copie.filter((c) => c.ordine_id === o.id)
    const tappe = TAPPE[o.tipo]
    const tot = valoreMerce(carte) + speseOrdine(o, carte, voci)
    return (
      <Link key={o.id} to={`/ordine/${o.id}`} className="scheda" style={{ color: 'var(--testo)' }}>
        <div className="riga tra" style={{ alignItems: 'flex-start' }}>
          <div className="colonna" style={{ gap: 3 }}>
            <h2>{o.sito}{o.venditore ? `, ${o.venditore}` : ''}</h2>
            <span className="tenue piccolo">{new Date(o.data).toLocaleDateString('it-IT')} · {o.tipo === 'giappone' ? 'Giappone tramite proxy' : 'Europa'} · {carte.length} {carte.length === 1 ? 'carta' : 'carte'}</span>
          </div>
          <div style={{ textAlign: 'right', flex: 'none' }}>
            <div className="tenue" style={{ fontSize: 12 }}>Totale</div>
            <div className="mono">{euro(tot)}</div>
          </div>
        </div>
        {!o.arrivato && (
          <div className="colonna" style={{ gap: 6 }}>
            <div className="riga" style={{ gap: 4 }}>
              {tappe.map((t, i) => <div key={t} style={{ flex: 1, height: 6, borderRadius: 3, background: i < o.tappa ? 'var(--accento)' : i === o.tappa ? 'var(--arancio)' : 'var(--bordo)' }} />)}
            </div>
            <span className="piccolo">{tappe[o.tappa]} <span className="tenue">({o.tappa + 1} di {tappe.length})</span></span>
          </div>
        )}
        <div className="riga" style={{ gap: 6, overflow: 'hidden' }}>
          {carte.slice(0, 6).map((c) => <span key={c.id} style={{ width: 40, flex: 'none' }}><ImmagineCopia copia={c} /></span>)}
        </div>
      </Link>
    )
  }

  return (
    <main className="pagina" style={{ maxWidth: 900 }}>
      <div className="riga tra">
        <h1>In viaggio</h1>
        <Link className="btn primario" to="/ordine/nuovo">Nuovo ordine</Link>
      </div>
      {aperti.length === 0 && <div className="vuoto">Nessun ordine in viaggio.<br />Crea un ordine da qui o dalla wantlist, con "L'ho comprata".</div>}
      <div className="colonna" style={{ gap: 12 }}>{aperti.map(scheda)}</div>
      {arrivati.length > 0 && (
        <>
          <button type="button" className="btn" onClick={() => setStorico(!storico)}>{storico ? 'Nascondi' : 'Mostra'} gli ordini arrivati ({arrivati.length})</button>
          {storico && <div className="colonna" style={{ gap: 12 }}>{arrivati.map(scheda)}</div>}
        </>
      )}
    </main>
  )
}

// --- Costi dell'ordine ----------------------------------------------------------

type Costi = Pick<Ordine, 'spedizione' | 'commissioni' | 'iva' | 'dazio' | 'diritti' | 'altre_spese' | 'corriere' | 'iva_al_sito'>
const COSTI_VUOTI: Costi = { spedizione: 0, commissioni: 0, iva: null, dazio: null, diritti: null, altre_spese: 0, corriere: null, iva_al_sito: false }
const TASSE: [CategoriaVoce, string][] = [['dazio', 'Dazio'], ['diritti', 'Diritti e sdoganamento'], ['iva', 'IVA all\'importazione']]

const numero = (v: string) => (v === '' ? 0 : Number(v))

// Campi delle spese. Dazio, diritti e IVA vuoti = stima dalle regole in Impostazioni.
function CampiCosti({ tipo, costi, merce, data, dataArrivo, onCambia }: {
  tipo: TipoOrdine; costi: Costi; merce: number; data: string; dataArrivo: string | null; onCambia: (c: Costi) => void
}) {
  const { voci } = useArchivio()
  const stima = stimaImportazione({ ...costi, tipo, data, data_arrivo: dataArrivo }, merce, voci)
  const tasse = tipo === 'giappone' || costi.iva != null || costi.dazio != null || costi.diritti != null
  const set = (x: Partial<Costi>) => onCambia({ ...costi, ...x })
  return (
    <div className="colonna" style={{ gap: 12 }}>
      <div className="griglia-campi">
        <label className="campo">Spedizione (€)
          <input type="number" inputMode="decimal" step="0.01" min="0" value={costi.spedizione || ''} onChange={(e) => set({ spedizione: numero(e.target.value) })} />
        </label>
        <label className="campo">Commissioni (sito, proxy, pagamento) (€)
          <input type="number" inputMode="decimal" step="0.01" min="0" value={costi.commissioni || ''} onChange={(e) => set({ commissioni: numero(e.target.value) })} />
        </label>
        {tasse && (
          <label className="campo">Corriere
            <input list="corrieri" value={costi.corriere ?? ''} onChange={(e) => set({ corriere: e.target.value || null })} />
          </label>
        )}
        {tasse && TASSE.map(([k, nome]) => (
          <label key={k} className="campo">{nome} (€)
            <input type="number" inputMode="decimal" step="0.01" min="0" value={costi[k] ?? ''}
              placeholder={`stima ${euro(stima[k])}`}
              onChange={(e) => set({ [k]: e.target.value === '' ? null : Number(e.target.value) })} />
          </label>
        ))}
        <label className="campo">Altre spese (€)
          <input type="number" inputMode="decimal" step="0.01" min="0" value={costi.altre_spese || ''} onChange={(e) => set({ altre_spese: numero(e.target.value) })} />
        </label>
      </div>
      <datalist id="corrieri">{CORRIERI.map((c) => <option key={c} value={c} />)}</datalist>
      {tasse && (
        <>
          <label className="spunta"><input type="checkbox" checked={costi.iva_al_sito} onChange={(e) => set({ iva_al_sito: e.target.checked })} />IVA già pagata al sito (IOSS)</label>
          <span className="tenue piccolo">Lascia vuoti dazio, diritti e IVA per usare la stima, e scrivi la cifra vera quando paghi il corriere. Le regole sono in Impostazioni, Tasse di importazione.</span>
        </>
      )}
    </div>
  )
}

// Righe del riepilogo costi, con le voci stimate segnate e spiegate.
function RiepilogoCosti({ o, merce }: { o: Ordine; merce: number }) {
  const { voci } = useArchivio()
  const c = costiEffettivi(o, merce, voci)
  const righe: [string, number, CategoriaVoce | null][] = [
    ['Spedizione', c.spedizione, null],
    ['Commissioni', c.commissioni, null],
    ['Dazio', c.dazio, 'dazio'],
    ['Diritti e sdoganamento', c.diritti, 'diritti'],
    ['IVA all\'importazione', c.iva, 'iva'],
    ['Altre spese', c.altre_spese, null],
  ]
  return (
    <>
      <div className="riga tra"><span>Carte</span><span className="mono">{euro(merce)}</span></div>
      {righe.filter(([, n]) => n > 0).map(([nome, n, cat]) => {
        const stimata = cat != null && c.stimati.includes(cat)
        return (
          <div key={nome} className="colonna" style={{ gap: 2 }}>
            <div className="riga tra tenue">
              <span>{nome}{stimata && <span className="etichetta arancio" style={{ marginLeft: 8 }}>stima</span>}</span>
              <span className="mono">{euro(n)}</span>
            </div>
            {stimata && c.stima.righe.filter((r) => r.voce.categoria === cat && r.importo > 0 && r.voce.nome !== nome).map((r) => (
              <span key={r.voce.id} className="tenue" style={{ fontSize: 12, paddingLeft: 12 }}>{r.voce.nome}: {euro(r.importo)}</span>
            ))}
          </div>
        )
      })}
      {o.tipo === 'giappone' && o.iva_al_sito && <span className="tenue piccolo">IVA già pagata al sito.</span>}
      <div className="riga tra" style={{ fontWeight: 600 }}>
        <span>Totale effettivo{c.stimati.length > 0 && <span className="tenue" style={{ fontWeight: 400 }}> (stimato)</span>}</span>
        <span className="mono">{euro(merce + c.totale)}</span>
      </div>
    </>
  )
}

// --- Nuovo ordine ---------------------------------------------------------------

interface Voce {
  chiave: string
  desiderio?: Desiderio
  carta: { carta_id: string; lingua: Lingua; nome: string; set_id: string; set_nome: string | null; numero: string; immagine: string | null; cardmarket_id: number | null }
  variante: string | null
  condizione: string
  prezzo: number | null
}

function daDesiderio(d: Desiderio): Voce {
  return {
    chiave: d.id, desiderio: d, variante: d.variante, condizione: d.condizione_min || 'NM', prezzo: null,
    carta: { carta_id: d.carta_id, lingua: d.lingua, nome: d.nome, set_id: d.set_id, set_nome: d.set_nome, numero: d.numero, immagine: d.immagine, cardmarket_id: d.cardmarket_id },
  }
}

function ScegliCarte({ esclusi, onDesiderio, onCatalogo, onChiudi }: {
  esclusi: string[]
  onDesiderio: (d: Desiderio) => void
  onCatalogo: (c: CartaCatalogo, l: Lingua, cat: Catalogo) => void
  onChiudi: () => void
}) {
  const { wantlist } = useArchivio()
  const [catalogo, setCatalogo] = useState(false)
  const liberi = wantlist.filter((d) => !d.ordine_id && !esclusi.includes(d.id))
  return (
    <div className="foglio-sfondo" onClick={onChiudi}>
      <div className="foglio" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Aggiungi carte all'ordine">
        <div className="riga tra"><h2>Aggiungi carte</h2><button type="button" className="btn" onClick={onChiudi}>Chiudi</button></div>
        <div className="chips">
          <button type="button" className={`chip ${!catalogo ? 'attivo' : ''}`} onClick={() => setCatalogo(false)}>Dalla wantlist</button>
          <button type="button" className={`chip ${catalogo ? 'attivo' : ''}`} onClick={() => setCatalogo(true)}>Dal catalogo</button>
        </div>
        {!catalogo && liberi.length === 0 && <div className="vuoto">Nessuna carta libera nella wantlist.</div>}
        {!catalogo && liberi.map((d) => (
          <button key={d.id} type="button" className="voce" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => onDesiderio(d)}>
            <span style={{ width: 44, flex: 'none' }}><ImmagineCarta immagine={d.immagine} lingua={d.lingua} setId={d.set_id} numero={d.numero} alt={d.nome} /></span>
            <span className="colonna" style={{ flex: 1, gap: 2 }}>
              <span className="taglia" style={{ fontWeight: 600 }}>{d.nome}</span>
              <span className="tenue piccolo taglia">{d.set_nome || d.set_id} · {d.numero} · {breveLingua(d.lingua)}</span>
            </span>
            <span style={{ color: 'var(--accento)', fontWeight: 600 }}>+</span>
          </button>
        ))}
        {catalogo && <CercaCarta onScelta={onCatalogo} />}
      </div>
    </div>
  )
}

export function NuovoOrdine() {
  const { caricato } = useArchivio()
  if (!caricato) return <main className="pagina"><Attesa /></main>
  return <ModuloNuovoOrdine />
}

function ModuloNuovoOrdine() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { wantlist, voci: regole, ricarica } = useArchivio()
  const iniziali = useMemo(() => (params.get('da') || '').split(',').map((id) => wantlist.find((d) => d.id === id)).filter(Boolean).map((d) => daDesiderio(d!)), [params, wantlist])
  const giapponese = iniziali.some((v) => v.carta.lingua === 'ja')
  const [tipo, setTipo] = useState<TipoOrdine>(giapponese ? 'giappone' : 'europa')
  const [sito, setSito] = useState(giapponese ? 'Mercari' : 'Cardmarket')
  const [venditore, setVenditore] = useState('')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [tracciamento, setTracciamento] = useState('')
  const [costi, setCosti] = useState<Costi>(COSTI_VUOTI)
  const [voci, setVoci] = useState<Voce[]>(iniziali)
  const [scegli, setScegli] = useState(false)
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const totCarte = voci.reduce((a, v) => a + Number(v.prezzo || 0), 0)
  const bozza: Ordine = { ...costi, id: '', tipo, sito, venditore: null, data, tracciamento: null, tappa: 0, arrivato: false, data_arrivo: null, note: null, created_at: '' }
  const cambia = (k: string, x: Partial<Voce>) => setVoci((vs) => vs.map((v) => (v.chiave === k ? { ...v, ...x } : v)))

  async function salva(e: React.FormEvent) {
    e.preventDefault()
    if (voci.length === 0) { setErrore('Aggiungi almeno una carta all\'ordine.'); return }
    setInvio(true); setErrore(null)
    try {
      const o = await nuovoOrdine({ tappa: 0, arrivato: false, tipo, sito: sito.trim() || 'Sconosciuto', venditore: venditore.trim() || null, data, tracciamento: tracciamento.trim() || null, ...costi })
      const create: Copia[] = []
      for (const v of voci) {
        let extra = {}
        if (!v.desiderio) {
          const d = await dettaglio(v.carta.lingua, v.carta.carta_id)
          extra = { rarita: d.rarita, illustratore: d.illustratore, cardmarket_id: d.cardmarketId, set_nome: d.setNome ?? v.carta.set_nome }
        }
        create.push(await nuovaCopia({
          ...v.carta, ...extra, stato: 'viaggio', ordine_id: o.id, variante: v.variante, condizione: v.condizione,
          prezzo_pagato: v.prezzo, data_arrivo: null, protezione: null,
        }))
        if (v.desiderio) await aggiornaDesiderio(v.desiderio.id, { ordine_id: o.id })
      }
      await salvaQuote(o, create, regole)
      await ricarica()
      navigate(`/ordine/${o.id}`, { replace: true })
    } catch (err) {
      setErrore((err as Error).message)
      setInvio(false)
    }
  }

  return (
    <main className="pagina" style={{ maxWidth: 720 }}>
      <Indietro to="/viaggio">In viaggio</Indietro>
      <h1>Nuovo ordine</h1>
      <form className="colonna" style={{ gap: 16 }} onSubmit={salva}>
        <div className="chips" role="group" aria-label="Tipo di ordine">
          <button type="button" className={`chip ${tipo === 'europa' ? 'attivo' : ''}`} aria-pressed={tipo === 'europa'} onClick={() => setTipo('europa')}>Europa</button>
          <button type="button" className={`chip ${tipo === 'giappone' ? 'attivo' : ''}`} aria-pressed={tipo === 'giappone'} onClick={() => setTipo('giappone')}>Giappone tramite proxy</button>
        </div>
        <div className="griglia-campi">
          <label className="campo">Sito<input list="siti" value={sito} onChange={(e) => setSito(e.target.value)} /></label>
          <datalist id="siti">{SITI.map((s) => <option key={s} value={s} />)}</datalist>
          <label className="campo">Venditore<input value={venditore} onChange={(e) => setVenditore(e.target.value)} /></label>
          <label className="campo">Data<input type="date" value={data} onChange={(e) => setData(e.target.value)} /></label>
          <label className="campo">Tracciamento<input value={tracciamento} onChange={(e) => setTracciamento(e.target.value)} /></label>
        </div>

        <section className="scheda">
          <div className="riga tra"><h2>Carte</h2><button type="button" className="btn contorno" onClick={() => setScegli(true)}>+ Aggiungi</button></div>
          {voci.length === 0 && <span className="tenue piccolo">Nessuna carta: aggiungile dalla wantlist o dal catalogo.</span>}
          {voci.map((v) => (
            <div key={v.chiave} className="colonna" style={{ gap: 8, paddingTop: 10, borderTop: '1px solid var(--bordo)' }}>
              <div className="riga" style={{ gap: 10 }}>
                <span style={{ width: 44, flex: 'none' }}><ImmagineCarta immagine={v.carta.immagine} lingua={v.carta.lingua} setId={v.carta.set_id} numero={v.carta.numero} alt={v.carta.nome} /></span>
                <span className="colonna" style={{ flex: 1, gap: 2 }}>
                  <span className="taglia" style={{ fontWeight: 600 }}>{v.carta.nome}</span>
                  <span className="tenue piccolo taglia">{v.carta.set_nome || v.carta.set_id} · {v.carta.numero} · {breveLingua(v.carta.lingua)}{v.variante ? ` · ${v.variante}` : ''}</span>
                </span>
                <button type="button" className="btn icona" aria-label={`Togli ${v.carta.nome}`} onClick={() => setVoci((vs) => vs.filter((x) => x.chiave !== v.chiave))}>✕</button>
              </div>
              <div className="griglia-campi">
                <label className="campo">Prezzo (€)
                  <input type="number" inputMode="decimal" step="0.01" min="0" value={v.prezzo ?? ''} onChange={(e) => cambia(v.chiave, { prezzo: e.target.value === '' ? null : Number(e.target.value) })} />
                </label>
                <label className="campo">Condizione
                  <select value={v.condizione} onChange={(e) => cambia(v.chiave, { condizione: e.target.value })}>
                    {CONDIZIONI.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </section>

        <section className="scheda">
          <h2>Spese dell'ordine</h2>
          <CampiCosti tipo={tipo} costi={costi} merce={totCarte} data={data} dataArrivo={null} onCambia={setCosti} />
          <div className="colonna" style={{ gap: 6, paddingTop: 8, borderTop: '1px solid var(--bordo)' }}>
            <RiepilogoCosti o={bozza} merce={totCarte} />
            <span className="tenue piccolo">Le spese vengono divise sulle carte in proporzione al prezzo.</span>
          </div>
        </section>

        {errore && <div className="avviso errore">{errore}</div>}
        <button className="btn primario" type="submit" disabled={invio}>{invio ? 'Salvataggio…' : 'Crea l\'ordine: carte in viaggio'}</button>
      </form>

      {scegli && (
        <ScegliCarte esclusi={voci.map((v) => v.chiave)} onChiudi={() => setScegli(false)}
          onDesiderio={(d) => { setVoci((vs) => [...vs, daDesiderio(d)]); setScegli(false) }}
          onCatalogo={(c, lingua, cat) => {
            setVoci((vs) => [...vs, {
              chiave: `${c.id}-${Date.now()}`, variante: null, condizione: 'NM', prezzo: null,
              carta: { carta_id: c.id, lingua, nome: c.nome, set_id: c.setId, set_nome: cat.setPerId.get(c.setId)?.nome ?? null, numero: c.numero, immagine: c.immagine || null, cardmarket_id: null },
            }])
            setScegli(false)
          }} />
      )}
    </main>
  )
}

// --- Dettaglio ordine -----------------------------------------------------------

export function OrdineVista() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { ordini, copie, wantlist, voci, caricato, ricarica } = useArchivio()
  const [costi, setCosti] = useState<Costi | null>(null)
  const [occupato, setOccupato] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const ordine = ordini.find((x) => x.id === id)

  // Se le regole o la data cambiano la stima, riallinea le quote salvate sulle carte.
  useEffect(() => {
    if (!caricato || !ordine) return
    const carteOrdine = copie.filter((c) => c.ordine_id === ordine.id)
    void salvaQuote(ordine, carteOrdine, voci).then((cambiate) => { if (cambiate) void ricarica() }).catch(() => {})
  }, [caricato, ordine, copie, voci, ricarica])

  if (!caricato) return <main className="pagina"><Attesa /></main>
  const o = ordine
  if (!o) return <main className="pagina"><Indietro to="/viaggio">In viaggio</Indietro><div className="vuoto">Ordine non trovato.</div></main>
  const carte = copie.filter((c) => c.ordine_id === o.id)
  const tappe = TAPPE[o.tipo]
  const quote = calcolaQuote(o, carte, voci)
  const totCarte = valoreMerce(carte)

  async function esegui(f: () => Promise<unknown>) {
    setOccupato(true); setErrore(null)
    try { await f(); await ricarica() } catch (e) { setErrore((e as Error).message) }
    setOccupato(false)
  }

  async function arrivato() {
    const oggi = new Date().toISOString().slice(0, 10)
    await aggiornaOrdine(o!.id, { arrivato: true, tappa: tappe.length - 1, data_arrivo: oggi })
    for (const c of carte) await aggiornaCopia(c.id, { stato: 'collezione', data_arrivo: c.data_arrivo || oggi })
    for (const d of wantlist.filter((x) => x.ordine_id === o!.id)) await eliminaDesiderio(d.id)
  }

  async function elimina() {
    if (!window.confirm('Eliminare l\'ordine? Le carte ancora in viaggio vengono tolte, e quelle della wantlist tornano libere.')) return
    await esegui(async () => {
      for (const c of carte.filter((x) => x.stato === 'viaggio')) await eliminaCopia(c.id)
      for (const d of wantlist.filter((x) => x.ordine_id === o!.id)) await aggiornaDesiderio(d.id, { ordine_id: null })
      await eliminaOrdine(o!.id)
      navigate('/viaggio', { replace: true })
    })
  }

  return (
    <main className="pagina" style={{ maxWidth: 900 }}>
      <Indietro to="/viaggio">In viaggio</Indietro>
      <div className="colonna" style={{ gap: 6 }}>
        {o.arrivato ? <span className="etichetta verde">Arrivato il {new Date(o.data_arrivo || o.data).toLocaleDateString('it-IT')}</span> : <span className="etichetta arancio">In viaggio</span>}
        <h1>{o.sito}{o.venditore ? `, ${o.venditore}` : ''}</h1>
        <span className="tenue">{new Date(o.data).toLocaleDateString('it-IT')} · {o.tipo === 'giappone' ? 'Giappone tramite proxy' : 'Europa'}{o.tracciamento ? ` · tracciamento ${o.tracciamento}` : ''}</span>
      </div>
      {errore && <div className="avviso errore">{errore}</div>}

      <section className="scheda">
        <h2>Tappe</h2>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tappe.map((t, i) => {
            const fatta = i < o.tappa || o.arrivato
            const ora = i === o.tappa && !o.arrivato
            return (
              <li key={t}>
                <button type="button" disabled={occupato || o.arrivato} onClick={() => void esegui(() => aggiornaOrdine(o.id, { tappa: i }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 44, background: 'transparent', border: 0, cursor: o.arrivato ? 'default' : 'pointer', textAlign: 'left', padding: 0 }}>
                  <span style={{ width: 16, height: 16, flex: 'none', borderRadius: 8, boxSizing: 'border-box', background: fatta ? 'var(--accento)' : 'transparent', border: `2px solid ${fatta ? 'var(--accento)' : ora ? 'var(--arancio)' : 'var(--bordo2)'}` }} />
                  <span style={{ fontWeight: ora ? 600 : 400, color: fatta || ora ? 'var(--testo)' : 'var(--tenue)' }}>{t}</span>
                  {ora && <span className="tenue piccolo">in corso</span>}
                </button>
              </li>
            )
          })}
        </ol>
        {!o.arrivato && <span className="tenue piccolo">Tocca una tappa per aggiornare lo stato.</span>}
      </section>

      <section className="scheda">
        <h2>Carte e costi effettivi</h2>
        {carte.map((c) => {
          const q = quote.get(c.id) ?? 0
          return (
            <Link key={c.id} to={`/carta/${c.id}`} className="riga" style={{ gap: 10, color: 'var(--testo)', paddingTop: 10, borderTop: '1px solid var(--bordo)' }}>
              <span style={{ width: 44, flex: 'none' }}><ImmagineCopia copia={c} /></span>
              <span className="colonna" style={{ flex: 1, gap: 2 }}>
                <span className="taglia" style={{ fontWeight: 600 }}>{c.nome}</span>
                <span className="tenue piccolo taglia">{c.numero} · {breveLingua(c.lingua)}{c.variante ? ` · ${c.variante}` : ''}</span>
              </span>
              <span className="colonna" style={{ flex: 'none', alignItems: 'flex-end', gap: 2 }}>
                <span className="mono">{euro(Number(c.prezzo_pagato || 0) + q)}</span>
                <span className="tenue" style={{ fontSize: 12 }}>{euro(c.prezzo_pagato)} + {euro(q)}</span>
              </span>
            </Link>
          )
        })}
        <div className="colonna" style={{ gap: 6, paddingTop: 10, borderTop: '1px solid var(--bordo)' }}>
          <RiepilogoCosti o={o} merce={totCarte} />
          <span className="tenue piccolo">Per ogni carta: prezzo + quota delle spese, divisa in proporzione al prezzo.</span>
        </div>
        {costi ? (
          <div className="colonna" style={{ gap: 10 }}>
            <CampiCosti tipo={o.tipo} costi={costi} merce={totCarte} data={o.data} dataArrivo={o.data_arrivo} onCambia={setCosti} />
            <div className="griglia-campi">
              <button type="button" className="btn" onClick={() => setCosti(null)}>Annulla</button>
              <button type="button" className="btn primario" disabled={occupato} onClick={() => void esegui(async () => {
                await aggiornaOrdine(o.id, costi)
                await salvaQuote({ ...o, ...costi }, carte, voci)
                setCosti(null)
              })}>Salva le spese</button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn" onClick={() => setCosti({ spedizione: o.spedizione, commissioni: o.commissioni, iva: o.iva, dazio: o.dazio, diritti: o.diritti, altre_spese: o.altre_spese, corriere: o.corriere, iva_al_sito: o.iva_al_sito })}>Modifica le spese</button>
        )}
      </section>

      {!o.arrivato && <button type="button" className="btn primario" disabled={occupato} onClick={() => void esegui(arrivato)}>Arrivato: sposta le carte in collezione</button>}
      <button type="button" className="btn pericolo" disabled={occupato} onClick={() => void elimina()}>Elimina ordine</button>
    </main>
  )
}

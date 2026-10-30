import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useArchivio } from '../archivio'
import { caricaCatalogo, confrontaNumeri, logoSet, normalizza, type Catalogo, type CartaCatalogo, type SetCatalogo } from '../catalogo'
import { Attesa, breveLingua, ImmagineCarta, Indietro } from '../comuni'
import { nuovaCollezione, nuoviDesideri } from '../dati'
import type { Lingua } from '../tipi'
import { LINGUE } from '../tipi'
import { PrezzoBreve } from './Valore'

const TUTTE_LE_LINGUE: Lingua[] = ['en', 'it', 'ja']

function useCataloghi() {
  const [cats, setCats] = useState<Partial<Record<Lingua, Catalogo>>>({})
  const [errore, setErrore] = useState<string | null>(null)
  useEffect(() => {
    let vivo = true
    for (const l of TUTTE_LE_LINGUE) {
      caricaCatalogo(l).then((c) => { if (vivo) setCats((x) => ({ ...x, [l]: c })) }, (e) => { if (vivo) setErrore((e as Error).message) })
    }
    return () => { vivo = false }
  }, [])
  return { cats, errore }
}

const meseAnno = (d: string) => (d ? new Date(d).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }) : '')

function LogoSet({ s, altezza }: { s: SetCatalogo; altezza: number }) {
  const [ok, setOk] = useState(true)
  const url = logoSet(s)
  if (!url || !ok) return null
  return <img src={url} alt="" style={{ height: altezza, maxWidth: altezza * 3, objectFit: 'contain', flex: 'none' }} onError={() => setOk(false)} />
}

// --- Elenco dei set --------------------------------------------------------------

export function ElencoSet() {
  const { copie } = useArchivio()
  const { cats, errore } = useCataloghi()
  const [lingua, setLingua] = useState<Lingua>('en')
  const [testo, setTesto] = useState('')
  const cat = cats[lingua]

  const gruppi = useMemo(() => {
    if (!cat) return []
    const q = normalizza(testo)
    const sets = cat.sets.filter((s) => !q || q.split(' ').every((p) => normalizza(`${s.id} ${s.nome} ${s.serie} ${s.sigla} ${s.altri}`).includes(p)))
    const perSerie = new Map<string, SetCatalogo[]>()
    for (const s of sets) perSerie.set(s.serie || 'Altri', [...(perSerie.get(s.serie || 'Altri') ?? []), s])
    return Array.from(perSerie.entries())
      .map(([serie, l]) => [serie, l.sort((a, b) => b.data.localeCompare(a.data))] as const)
      .sort((a, b) => (b[1][0]?.data ?? '').localeCompare(a[1][0]?.data ?? ''))
  }, [cat, testo])

  const possedute = (setId: string) => new Set(copie.filter((c) => c.set_id === setId && c.lingua === lingua && c.stato !== 'venduta').map((c) => c.carta_id)).size

  return (
    <main className="pagina" style={{ maxWidth: 900 }}>
      <Indietro to="/">Collezioni</Indietro>
      <h1>Esplora i set</h1>
      <div className="chips" role="group" aria-label="Lingua">
        {LINGUE.map((l) => <button key={l.id} type="button" className={`chip ${lingua === l.id ? 'attivo' : ''}`} aria-pressed={lingua === l.id} onClick={() => setLingua(l.id)}>{l.nome}</button>)}
      </div>
      <input className="campo-libero" type="search" value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Nome, sigla o serie (es. generazioni, EVO, sole e luna)" aria-label="Cerca un set" />
      {errore && <div className="avviso errore">Catalogo non disponibile: {errore}</div>}
      {!cat && !errore && <Attesa />}
      {cat && gruppi.length === 0 && <div className="vuoto">Nessun set trovato.</div>}
      {gruppi.map(([serie, sets]) => (
        <section key={serie} className="colonna" style={{ gap: 8 }}>
          <h2 className={lingua === 'ja' ? 'jp' : ''}>{serie}</h2>
          {sets.map((s) => {
            const n = possedute(s.id)
            return (
              <Link key={s.id} to={`/set/${lingua}/${encodeURIComponent(s.id)}`} className="voce" style={{ gap: 12 }}>
                <span style={{ width: 64, display: 'flex', justifyContent: 'center', flex: 'none' }}><LogoSet s={s} altezza={28} /></span>
                <span className="colonna" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                  <span className={`taglia ${lingua === 'ja' ? 'jp' : ''}`} style={{ fontWeight: 600 }}>{s.nome}</span>
                  <span className="tenue piccolo taglia">{[s.id, s.sigla, s.data ? s.data.slice(0, 4) : '', s.totale ? `${s.totale} carte` : ''].filter(Boolean).join(' · ')}</span>
                </span>
                {n > 0 && <span className="etichetta verde">{n}{s.totale ? `/${s.totale}` : ''}</span>}
                <span className="tenue" aria-hidden="true">›</span>
              </Link>
            )
          })}
        </section>
      ))}
    </main>
  )
}

// --- Pagina di un set --------------------------------------------------------------

type Filtro = 'tutte' | 'possedute' | 'mancanti' | 'wantlist'

export function SetVista() {
  const params = useParams()
  const lingua = (params.lingua ?? 'en') as Lingua
  const id = decodeURIComponent(params.id ?? '')
  const navigate = useNavigate()
  const { copie, wantlist, collezioni, caricato, ricarica } = useArchivio()
  const { cats, errore: erroreCat } = useCataloghi()
  const [filtro, setFiltro] = useState<Filtro>('tutte')
  const [testo, setTesto] = useState('')
  const [aperta, setAperta] = useState<CartaCatalogo | null>(null)
  const [selezione, setSelezione] = useState<Set<string> | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [occupato, setOccupato] = useState(false)
  useEffect(() => { setSelezione(null); setAperta(null) }, [lingua, id])

  const cat = cats[lingua]
  const set = cat?.setPerId.get(id)
  const carte = useMemo(() => (cat ? cat.carte.filter((c) => c.setId === id).sort((a, b) => confrontaNumeri(a.numero, b.numero)) : []), [cat, id])

  if (!caricato || (!cat && !erroreCat)) return <main className="pagina"><Attesa /></main>
  if (!cat || !set) return <main className="pagina"><Indietro to="/set">Esplora i set</Indietro><div className="vuoto">{erroreCat ? `Catalogo non disponibile: ${erroreCat}` : 'Set non trovato.'}</div></main>

  const mie = copie.filter((c) => c.set_id === id && c.lingua === lingua && c.stato !== 'venduta')
  const perCarta = new Map<string, typeof mie>()
  for (const c of mie) perCarta.set(c.carta_id, [...(perCarta.get(c.carta_id) ?? []), c])
  const inWantlist = new Map(wantlist.filter((d) => d.lingua === lingua && d.set_id === id).map((d) => [d.carta_id, d]))
  const possedute = carte.filter((c) => perCarta.has(c.id)).length
  const pct = carte.length ? Math.round((100 * possedute) / carte.length) : 0
  const altreLingue = TUTTE_LE_LINGUE.filter((l) => cats[l]?.setPerId.has(id))
  const collezione = collezioni.find((k) => k.tipo === 'set' && k.set_id === id && k.lingua === lingua && !k.regole?.prefisso)

  const q = normalizza(testo)
  const elenco = carte.filter((c) => {
    const mia = perCarta.has(c.id)
    if (filtro === 'possedute' && !mia) return false
    if (filtro === 'mancanti' && mia) return false
    if (filtro === 'wantlist' && !inWantlist.has(c.id)) return false
    return !q || q.split(' ').every((p) => normalizza(`${c.nome} ${c.alias} ${c.numero}`).includes(p))
  })

  async function esegui(f: () => Promise<unknown>) {
    setOccupato(true); setErrore(null)
    try { await f(); await ricarica() } catch (e) { setErrore((e as Error).message) }
    setOccupato(false)
  }

  const inWantlistTutte = (lista: CartaCatalogo[]) => esegui(async () => {
    const nuove = lista.filter((c) => !inWantlist.has(c.id))
    if (nuove.length) await nuoviDesideri(nuove.map((c) => ({ carta_id: c.id, lingua, nome: c.nome, set_id: id, set_nome: set.nome, numero: c.numero, immagine: c.immagine || null })))
    setSelezione(null)
  })

  return (
    <main className="pagina" style={{ paddingBottom: selezione ? 150 : undefined }}>
      <Indietro to="/set">Esplora i set</Indietro>
      <div className="riga" style={{ gap: 14, alignItems: 'center' }}>
        <LogoSet s={set} altezza={48} />
        <div className="colonna" style={{ gap: 4, minWidth: 0 }}>
          <h1 className={lingua === 'ja' ? 'jp' : ''} style={{ lineHeight: 1.25 }}>{set.nome}</h1>
          <span className="tenue piccolo">{[set.serie, meseAnno(set.data), set.sigla, set.id].filter(Boolean).join(' · ')}</span>
        </div>
      </div>
      {altreLingue.length > 1 && (
        <div className="chips" role="group" aria-label="Lingua del set">
          {altreLingue.map((l) => (
            <button key={l} type="button" className={`chip ${l === lingua ? 'attivo' : ''}`} aria-pressed={l === lingua}
              onClick={() => navigate(`/set/${l}/${encodeURIComponent(id)}`, { replace: true })}>{LINGUE.find((x) => x.id === l)?.nome}</button>
          ))}
        </div>
      )}
      {errore && <div className="avviso errore">{errore}</div>}

      <div className="scheda">
        <div className="riga tra"><span>Possiedi {possedute} di {carte.length}</span><span className="tenue piccolo">{inWantlist.size} in wantlist</span></div>
        <div className="barra"><div style={{ width: `${pct}%` }} /></div>
        <div className="colonna" style={{ gap: 8 }}>
          {collezione
            ? <Link className="btn" to={`/collezione/${collezione.id}`}>Apri la collezione</Link>
            : <button type="button" className="btn" disabled={occupato} onClick={() => void esegui(async () => {
                const k = await nuovaCollezione({ nome: set.nome, tipo: 'set', regole: {}, set_id: id, set_nome: set.nome, lingua })
                navigate(`/collezione/${k.id}`)
              })}>Crea una collezione da questo set</button>}
          <button type="button" className={`btn ${selezione ? 'primario' : 'contorno'}`} onClick={() => setSelezione(selezione ? null : new Set())}>
            {selezione ? 'Fine selezione' : 'Seleziona per la wantlist'}
          </button>
        </div>
      </div>

      <div className="chips">
        {([['tutte', `Tutte (${carte.length})`], ['possedute', `Possedute (${possedute})`], ['mancanti', `Mancanti (${carte.length - possedute})`], ['wantlist', `In wantlist (${inWantlist.size})`]] as [Filtro, string][]).map(([k, t]) => (
          <button key={k} type="button" className={`chip ${filtro === k ? 'attivo' : ''}`} aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{t}</button>
        ))}
      </div>
      <input className="campo-libero" type="search" value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Cerca in questo set: nome o numero" aria-label="Cerca nel set" />

      <div className="griglia-carte fitta">
        {elenco.map((c) => {
          const mia = perCarta.get(c.id)
          const desiderio = inWantlist.get(c.id)
          const scelta = selezione?.has(c.id)
          const viaggio = mia?.every((x) => x.stato === 'viaggio')
          return (
            <button key={c.id} type="button" className="carta" style={{ padding: 6, borderColor: scelta ? 'var(--accento)' : undefined, outline: scelta ? '2px solid var(--accento)' : undefined }}
              onClick={() => {
                if (!selezione) { setAperta(c); return }
                const s = new Set(selezione)
                if (s.has(c.id)) s.delete(c.id); else s.add(c.id)
                setSelezione(s)
              }}>
              <span className={`con-numero ${mia ? '' : 'mancante'}`}>
                <ImmagineCarta immagine={c.immagine} lingua={lingua} setId={id} numero={c.numero} alt={c.nome} />
                {mia && mia.length > 1 && <span className="quante" style={{ fontSize: 12, padding: '1px 6px' }}>×{mia.length}</span>}
                {scelta && <span className="quante" style={{ left: 6, right: 'auto', background: 'var(--accento)' }}>✓</span>}
              </span>
              <span className={`piccolo taglia ${lingua === 'ja' ? 'jp' : ''}`} style={{ fontWeight: mia ? 600 : 400 }}>{c.numero} · {c.nome}</span>
              {mia && <PrezzoBreve cm={mia[0].cardmarket_id} tp={mia[0].tcgplayer_id} variante={mia[0].variante} />}
              {mia ? <span className="piccolo" style={{ color: viaggio ? 'var(--arancio)' : 'var(--verde)' }}>{viaggio ? 'In viaggio' : 'Posseduta'}</span>
                : desiderio ? <span className="piccolo" style={{ color: 'var(--accento)' }}>In wantlist</span>
                : <span className="piccolo tenue">Mancante</span>}
            </button>
          )
        })}
      </div>
      {elenco.length === 0 && <div className="vuoto">Nessuna carta con questi filtri.</div>}

      {selezione && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 'calc(64px + env(safe-area-inset-bottom))', padding: '10px 16px', background: 'var(--superficie)', borderTop: '1px solid var(--bordo)', zIndex: 5 }}>
          <div className="riga" style={{ gap: 8, maxWidth: 900, margin: '0 auto' }}>
            <button type="button" className="btn" onClick={() => setSelezione(new Set(elenco.filter((c) => !perCarta.has(c.id) && !inWantlist.has(c.id)).map((c) => c.id)))}>Tutte le mancanti</button>
            <button type="button" className="btn primario" style={{ flex: 1 }} disabled={occupato || selezione.size === 0}
              onClick={() => void inWantlistTutte(carte.filter((c) => selezione.has(c.id)))}>Metti in wantlist ({selezione.size})</button>
          </div>
        </div>
      )}

      {aperta && (() => {
        const mia = perCarta.get(aperta.id)
        const desiderio = inWantlist.get(aperta.id)
        return (
          <div className="foglio-sfondo" onClick={() => setAperta(null)}>
            <div className="foglio" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={aperta.nome}>
              <div className="riga" style={{ gap: 14, alignItems: 'flex-start' }}>
                <span style={{ width: 96, flex: 'none' }}><ImmagineCarta immagine={aperta.immagine} lingua={lingua} setId={id} numero={aperta.numero} alt={aperta.nome} /></span>
                <span className="colonna" style={{ gap: 4, minWidth: 0 }}>
                  <h2 className={lingua === 'ja' ? 'jp' : ''}>{aperta.nome}</h2>
                  <span className="tenue piccolo">{set.nome} · {aperta.numero} · {breveLingua(lingua)}</span>
                  {aperta.alias && <span className="tenue piccolo">{aperta.alias}</span>}
                  {mia && <span className="piccolo" style={{ color: 'var(--verde)' }}>{mia.length === 1 ? 'Ne hai 1 copia' : `Ne hai ${mia.length} copie`}</span>}
                </span>
              </div>
              {mia && <Link className="btn primario" to={`/carta/${mia[0].id}`}>Apri la tua copia</Link>}
              <Link className={`btn ${mia ? '' : 'primario'}`} to={`/aggiungi?carta=${encodeURIComponent(aperta.id)}&lingua=${lingua}`}>{mia ? 'Aggiungi un\'altra copia' : 'Aggiungi alla collezione'}</Link>
              {desiderio
                ? <Link className="btn" to={`/desiderio/${desiderio.id}`}>Apri nella wantlist</Link>
                : <Link className="btn" to={`/wantlist/aggiungi?carta=${encodeURIComponent(aperta.id)}&lingua=${lingua}`}>Aggiungi alla wantlist</Link>}
              <button type="button" className="btn" onClick={() => setAperta(null)}>Chiudi</button>
            </div>
          </div>
        )
      })()}
    </main>
  )
}

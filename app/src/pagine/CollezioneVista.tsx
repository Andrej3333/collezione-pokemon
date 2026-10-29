import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { copieDi, useArchivio } from '../archivio'
import { caricaCatalogo, type CartaCatalogo } from '../catalogo'
import { Attesa, breveLingua, ImmagineCarta, ImmagineCopia, Indietro } from '../comuni'
import { collega, eliminaCollezione, nuoviDesideri } from '../dati'
import { LINGUE } from '../tipi'
import { GrigliaCopie } from './TutteLeCarte'

export function CollezioneVista() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { copie, collezioni, legami, wantlist, caricato, ricarica } = useArchivio()
  const col = collezioni.find((c) => c.id === id)
  const [carteSet, setCarteSet] = useState<CartaCatalogo[] | null>(null)
  const [filtro, setFiltro] = useState<'tutte' | 'possedute' | 'mancanti'>('tutte')
  const [scegli, setScegli] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    if (!col || col.tipo !== 'set' || !col.lingua) return
    caricaCatalogo(col.lingua).then(
      (cat) => {
        const pre = (col.regole?.prefisso || '').toUpperCase()
        setCarteSet(cat.carte.filter((c) => c.setId === col.set_id && (!pre || c.numero.toUpperCase().startsWith(pre))))
      },
      (e) => setErrore((e as Error).message))
  }, [col])

  const possedute = useMemo(() => copie.filter((c) => c.stato !== 'venduta'), [copie])
  if (!caricato) return <main className="pagina"><Attesa /></main>
  if (!col) return <main className="pagina"><Indietro to="/">Collezioni</Indietro><div className="vuoto">Collezione non trovata.</div></main>
  const membri = copieDi(col, possedute, legami)
  const inWantlist = new Set(wantlist.filter((d) => d.lingua === col.lingua).map((d) => d.carta_id))

  async function aggiungiWantlist(carte: CartaCatalogo[]) {
    if (!col) return
    try {
      await nuoviDesideri(carte.map((c) => ({
        carta_id: c.id, lingua: col.lingua!, nome: c.nome, set_id: c.setId, set_nome: col.set_nome,
        numero: c.numero, immagine: c.immagine || null,
      })))
      await ricarica()
    } catch (e) { setErrore((e as Error).message) }
  }

  async function elimina() {
    if (!col || !window.confirm(`Eliminare la collezione "${col.nome}"? Le carte restano nella tua collezione.`)) return
    try { await eliminaCollezione(col.id); await ricarica(); navigate('/', { replace: true }) } catch (e) { setErrore((e as Error).message) }
  }

  const testata = (
    <>
      <Indietro to="/">Collezioni</Indietro>
      <div className="colonna" style={{ gap: 6 }}>
        <span className={`etichetta ${col.tipo === 'set' ? 'blu' : col.tipo === 'automatica' ? 'verde' : ''}`}>
          {col.tipo === 'set' ? 'Set da completare' : col.tipo === 'automatica' ? 'Automatica' : 'Scelta da te'}
        </span>
        <h1 style={{ lineHeight: 1.3 }}>{col.nome}</h1>
        {col.tipo === 'set' && <span className="tenue">{LINGUE.find((l) => l.id === col.lingua)?.nome} · {col.set_nome} ({col.set_id}){col.regole?.prefisso ? `, solo i numeri ${col.regole.prefisso}…` : ''}</span>}
        {col.tipo === 'automatica' && (
          <span className="tenue piccolo" style={{ lineHeight: 1.5 }}>
            Regole: {[
              col.regole.lingua && `lingua ${breveLingua(col.regole.lingua)}`,
              col.regole.gradata === 'si' && 'solo gradate', col.regole.gradata === 'no' && 'solo non gradate',
              col.regole.pokemon && `nome con "${col.regole.pokemon}"`, col.regole.rarita && `rarità con "${col.regole.rarita}"`,
            ].filter(Boolean).join(', ') || 'nessuna, quindi tutte le carte'}
          </span>
        )}
      </div>
      {errore && <div className="avviso errore">{errore}</div>}
    </>
  )

  if (col.tipo === 'set') {
    if (!carteSet) return <main className="pagina">{testata}<Attesa /></main>
    const perNumero = new Map(membri.map((m) => [m.numero, m]))
    const possedutiN = carteSet.filter((c) => perNumero.has(c.numero)).length
    const elenco = carteSet.filter((c) => filtro === 'tutte' || (filtro === 'possedute') === perNumero.has(c.numero))
    const pct = carteSet.length ? Math.round((100 * possedutiN) / carteSet.length) : 0
    return (
      <main className="pagina">
        {testata}
        <div className="scheda">
          <div className="riga tra"><span>{possedutiN} di {carteSet.length}</span><span className="tenue piccolo">{carteSet.length - possedutiN} {carteSet.length - possedutiN === 1 ? 'mancante' : 'mancanti'}</span></div>
          <div className="barra"><div style={{ width: `${pct}%` }} /></div>
          {(() => {
            const daAggiungere = carteSet.filter((c) => !perNumero.has(c.numero) && !inWantlist.has(c.id))
            return daAggiungere.length > 0
              ? <button type="button" className="btn contorno" onClick={() => void aggiungiWantlist(daAggiungere)}>Tutte le mancanti in wantlist ({daAggiungere.length})</button>
              : <span className="tenue piccolo">Tutte le mancanti sono già in wantlist.</span>
          })()}
        </div>
        <div className="chips">
          {([['tutte', `Tutte (${carteSet.length})`], ['possedute', `Possedute (${possedutiN})`], ['mancanti', `Mancanti (${carteSet.length - possedutiN})`]] as const).map(([k, t]) => (
            <button key={k} type="button" className={`chip ${filtro === k ? 'attivo' : ''}`} aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{t}</button>
          ))}
        </div>
        <div className="griglia-carte fitta">
          {elenco.map((c) => {
            const m = perNumero.get(c.numero)
            const contenuto = (
              <>
                {m ? <ImmagineCopia copia={m} /> : <span className="mancante"><ImmagineCarta immagine={c.immagine} lingua={col.lingua!} setId={c.setId} numero={c.numero} alt={c.nome} /></span>}
                <span className={`piccolo taglia ${col.lingua === 'ja' ? 'jp' : ''}`} style={{ fontWeight: m ? 600 : 400 }}>{c.numero} · {c.nome}</span>
                {m ? <span className="piccolo" style={{ color: 'var(--verde)' }}>Posseduta</span>
                  : inWantlist.has(c.id) ? <span className="piccolo" style={{ color: 'var(--accento)' }}>In wantlist</span>
                  : <button type="button" className="btn" style={{ minHeight: 40, fontSize: 13, padding: '0 6px' }} onClick={() => void aggiungiWantlist([c])}>+ Wantlist</button>}
              </>
            )
            return m
              ? <Link key={c.id} to={`/carta/${m.id}`} className="carta" style={{ padding: 6 }}>{contenuto}</Link>
              : <div key={c.id} className="carta" style={{ padding: 6, cursor: 'default' }}>{contenuto}</div>
          })}
        </div>
        <button type="button" className="btn pericolo" onClick={elimina}>Elimina collezione</button>
      </main>
    )
  }

  const nonMembri = possedute.filter((c) => !membri.some((m) => m.id === c.id))
  return (
    <main className="pagina">
      {testata}
      {col.tipo === 'manuale' && <button type="button" className="btn contorno" onClick={() => setScegli(true)}>Aggiungi carte che hai</button>}
      {membri.length === 0
        ? <div className="vuoto">{col.tipo === 'manuale' ? 'Ancora nessuna carta in questa collezione.' : 'Nessuna carta rispetta le regole, per ora.'}</div>
        : <GrigliaCopie copie={membri} />}
      <button type="button" className="btn pericolo" onClick={elimina}>Elimina collezione</button>

      {scegli && (
        <div className="foglio-sfondo" onClick={() => setScegli(false)}>
          <div className="foglio" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Aggiungi carte alla collezione">
            <div className="riga tra"><h2>Aggiungi a {col.nome}</h2><button type="button" className="btn" onClick={() => setScegli(false)}>Chiudi</button></div>
            {nonMembri.length === 0 && <div className="vuoto">Tutte le tue carte sono già qui.</div>}
            {nonMembri.map((c) => (
              <button key={c.id} type="button" className="voce" style={{ textAlign: 'left', cursor: 'pointer' }}
                onClick={async () => { try { await collega(col.id, c.id); await ricarica() } catch (e) { setErrore((e as Error).message) } }}>
                <span style={{ width: 44, flex: 'none' }}><ImmagineCopia copia={c} /></span>
                <span className="colonna" style={{ flex: 1, gap: 2 }}>
                  <span className="taglia" style={{ fontWeight: 600 }}>{c.nome}</span>
                  <span className="tenue piccolo taglia">{c.set_nome || c.set_id} · {c.numero} · {breveLingua(c.lingua)}</span>
                </span>
                <span style={{ color: 'var(--accento)', fontWeight: 600 }}>+</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

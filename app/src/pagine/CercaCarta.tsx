import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { caricaCatalogo, cerca, logoSet, type Catalogo, type CartaCatalogo, type RisultatiRicerca } from '../catalogo'
import { breveLingua, ImmagineCarta } from '../comuni'
import type { Lingua } from '../tipi'
import { LINGUE } from '../tipi'

type Scelta = Lingua | 'tutte'
const CHIAVE_LINGUA = 'ricerca-lingua'

function linguaSalvata(): Scelta {
  try { return (localStorage.getItem(CHIAVE_LINGUA) as Scelta) || 'tutte' } catch { return 'tutte' }
}

// Ricerca nel catalogo: lingua (o tutte), testo, set trovati e carte con immagine.
// Chi la usa decide cosa fare della carta scelta; con mostraSet i set si aprono in una pagina loro.
export function CercaCarta({ onScelta, mostraSet, testoIniziale }: {
  onScelta: (c: CartaCatalogo, lingua: Lingua, cat: Catalogo) => void
  mostraSet?: boolean
  testoIniziale?: string
}) {
  const [lingua, setLingua] = useState<Scelta>(linguaSalvata)
  const [cataloghi, setCataloghi] = useState<Catalogo[] | null>(null)
  const [erroreCat, setErroreCat] = useState<string | null>(null)
  const [testo, setTesto] = useState(testoIniziale ?? '')
  const [ris, setRis] = useState<RisultatiRicerca>({ carte: [], set: [], altri: 0 })

  useEffect(() => {
    try { localStorage.setItem(CHIAVE_LINGUA, lingua) } catch { /* niente */ }
    setCataloghi(null)
    setErroreCat(null)
    const lingue: Lingua[] = lingua === 'tutte' ? ['en', 'it', 'ja'] : [lingua]
    Promise.all(lingue.map(caricaCatalogo)).then(setCataloghi, (e) => setErroreCat((e as Error).message))
  }, [lingua])

  useEffect(() => {
    if (!cataloghi) return
    const t = setTimeout(() => setRis(cerca(cataloghi, testo)), 150)
    return () => clearTimeout(t)
  }, [cataloghi, testo])

  const tutte = lingua === 'tutte'
  return (
    <>
      <div className="chips" role="group" aria-label="Lingua della carta">
        {([['tutte', 'Tutte'], ...LINGUE.map((l) => [l.id, l.nome])] as [Scelta, string][]).map(([id, nome]) => (
          <button key={id} type="button" className={`chip ${lingua === id ? 'attivo' : ''}`} aria-pressed={lingua === id} onClick={() => setLingua(id)}>{nome}</button>
        ))}
      </div>
      <input className="campo-libero" type="search" autoFocus aria-label="Cerca nel catalogo"
        placeholder="Nome, numero o set (es. pikachu generazioni, SV2a 201)"
        value={testo} onChange={(e) => setTesto(e.target.value)} />
      {erroreCat && <div className="avviso errore">Catalogo non disponibile: {erroreCat}</div>}
      {!cataloghi && !erroreCat && <div className="vuoto">Caricamento del catalogo…</div>}
      {cataloghi && testo.trim() === '' && (
        <div className="avviso">Cerca per nome, numero o set, in qualsiasi ordine e lingua: <b>pikachu generazioni</b>, <b>sylveon radiant</b>, <b>charizard 151</b>, <b>SV2a 201</b>. I nomi inglesi trovano anche le carte giapponesi.</div>
      )}
      {mostraSet && ris.set.length > 0 && (
        <div className="colonna" style={{ gap: 6 }}>
          <span className="tenue piccolo">Set</span>
          <div className="chips">
            {ris.set.map(({ s, lingua: l }) => (
              <Link key={`${l}:${s.id}`} to={`/set/${l}/${encodeURIComponent(s.id)}`} className="chip riga" style={{ gap: 8, textDecoration: 'none' }}>
                {logoSet(s) && <img src={logoSet(s)!} alt="" style={{ height: 22, maxWidth: 60, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                <span className={l === 'ja' ? 'jp' : ''}>{s.nome}</span>
                {tutte && <span className="tenue" style={{ fontSize: 12 }}>{breveLingua(l)}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
      {cataloghi && testo.trim() !== '' && ris.carte.length === 0 && <div className="vuoto">Nessuna carta trovata.</div>}
      <div className="griglia-carte fitta">
        {cataloghi && ris.carte.map(({ c, lingua: l, cat, set }) => (
          <button key={`${l}:${c.id}`} type="button" className="carta" onClick={() => onScelta(c, l, cat)}>
            <ImmagineCarta immagine={c.immagine} lingua={l} setId={c.setId} numero={c.numero} alt={c.nome} />
            <span className={`nome taglia piccolo ${l === 'ja' ? 'jp' : ''}`}>{c.nome}</span>
            <span className="tenue piccolo taglia">{c.numero} · {set?.nome ?? c.setId}</span>
            {tutte && <span className="etichetta" style={{ fontSize: 11, padding: '2px 6px' }}>{breveLingua(l)}</span>}
          </button>
        ))}
      </div>
      {ris.altri > 0 && <div className="tenue piccolo">Mostro i primi {ris.carte.length} risultati su {ris.carte.length + ris.altri}: aggiungi parole per restringere.</div>}
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
        <span className="tenue">
          <Link to={`/set/${lingua}/${encodeURIComponent(c.setId)}`}>{set?.nome ?? c.setId}</Link> · {c.numero}{set?.totale && /^\d+$/.test(c.numero) ? `/${set.totale}` : ''}
        </span>
        <span className="tenue">{LINGUE.find((l) => l.id === lingua)?.nome}</span>
      </div>
    </div>
  )
}

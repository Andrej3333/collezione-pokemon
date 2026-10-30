import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { indirizziImmagine } from './catalogo'
import { indirizzoFoto } from './dati'
import type { Copia, Lingua, Stato } from './tipi'
import { LINGUE } from './tipi'

export function Testata() {
  return (
    <header className="testata">
      <div>
        <span className="marchio">Collezione Pokémon</span>
        <Link to="/impostazioni" aria-label="Impostazioni" className="btn icona" style={{ border: 0, background: 'transparent' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" fill="none" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" /></svg>
        </Link>
      </div>
    </header>
  )
}

const VOCI = [
  { to: '/', nome: 'Collezioni', icona: <><rect x="4" y="3" width="9" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none" /><rect x="11" y="8" width="9" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" fill="var(--superficie)" /></> },
  { to: '/wantlist', nome: 'Wantlist', icona: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinejoin="round" /> },
  { to: '/viaggio', nome: 'In viaggio', icona: <path d="M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinejoin="round" /> },
  { to: '/browser', nome: 'Browser', icona: <><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" fill="none" /><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" stroke="currentColor" strokeWidth="1.5" fill="none" /></> },
]

export function Menu() {
  return (
    <nav className="menu" aria-label="Sezioni">
      <div>
        {VOCI.map((v) => (
          <NavLink key={v.to} to={v.to} end={v.to === '/'}
            className={({ isActive }) => (isActive || (v.to === '/' && /^#\/(carte|carta|collezione|aggiungi|nuova|vendute)/.test(location.hash)) || (v.to === '/wantlist' && /^#\/desiderio/.test(location.hash)) || (v.to === '/viaggio' && /^#\/ordine/.test(location.hash)) ? 'attivo' : '')}>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">{v.icona}</svg>
            {v.nome}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export function Indietro({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to} className="indietro">‹ {children}</Link>
}

export function breveLingua(l: Lingua): string {
  return LINGUE.find((x) => x.id === l)?.breve ?? l
}

export function EtichettaStato({ stato }: { stato: Stato }) {
  if (stato === 'viaggio') return <span className="etichetta arancio">In viaggio</span>
  if (stato === 'venduta') return <span className="etichetta">Venduta</span>
  return <span className="etichetta verde">In collezione</span>
}

// Immagine di una carta: prova in ordine la tua foto, TCGdex, Limitless; se nessuna c'e, un riquadro vuoto.
export function ImmagineCarta(props: {
  immagine: string | null | undefined
  lingua: Lingua
  setId: string
  numero: string
  foto?: string | null
  grande?: boolean
  alt: string
}) {
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [indice, setIndice] = useState(0)
  useEffect(() => {
    setIndice(0)
    if (props.foto) void indirizzoFoto(props.foto).then(setFotoUrl)
    else setFotoUrl(null)
  }, [props.foto, props.immagine, props.setId, props.numero])

  const lista = [...(fotoUrl ? [fotoUrl] : []), ...indirizziImmagine(props)]
  if (indice >= lista.length) return <div className="img-vuota"><span>immagine non disponibile</span></div>
  return (
    <img className="img-carta" src={lista[indice]} alt={props.alt} loading="lazy"
      onError={() => setIndice((i) => i + 1)} />
  )
}

export function ImmagineCopia({ copia, grande }: { copia: Copia; grande?: boolean }) {
  return (
    <ImmagineCarta immagine={copia.immagine} lingua={copia.lingua} setId={copia.set_id} numero={copia.numero}
      foto={copia.foto_url} grande={grande} alt={`${copia.nome} ${copia.numero}`} />
  )
}

export function Attesa() {
  return <div className="vuoto">Caricamento…</div>
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apri, appNativa, indirizzoDa, leggiSiti, URL_APK, type Sito } from '../browser'

function Iniziale({ sito }: { sito: Sito }) {
  const [errore, setErrore] = useState(false)
  let host = ''
  try { host = new URL(sito.url).hostname } catch { /* indirizzo non valido */ }
  return (
    <span style={{ width: 40, height: 40, flex: 'none', borderRadius: 10, background: 'var(--superficie2)', display: 'grid', placeItems: 'center', fontWeight: 700, color: 'var(--accento)', overflow: 'hidden' }}>
      {host && !errore
        ? <img src={`https://icons.duckduckgo.com/ip3/${host}.ico`} alt="" width={24} height={24} onError={() => setErrore(true)} />
        : sito.nome.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function Browser() {
  const nativa = appNativa()
  const [siti, setSiti] = useState<Sito[] | null>(null)
  const [indirizzo, setIndirizzo] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  useEffect(() => { void leggiSiti().then(setSiti, (e) => setErrore((e as Error).message)) }, [])

  async function vai(url: string, titolo?: string) {
    setErrore(null)
    try { await apri(url, titolo) } catch (e) { setErrore((e as Error).message) }
  }

  return (
    <main className="pagina" style={{ maxWidth: 720 }}>
      <h1>Browser</h1>
      {!nativa && (
        <div className="avviso" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span>Il browser interno funziona nell'app Android, e poi nell'app Windows. Qui i siti si aprono in una nuova scheda del browser normale.</span>
          <a className="btn" href={URL_APK}>Scarica l'app Android</a>
        </div>
      )}
      <form className="riga" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (indirizzo.trim()) void vai(indirizzoDa(indirizzo)) }}>
        <input className="campo-libero" type="search" inputMode="url" value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)} placeholder="Indirizzo o ricerca" aria-label="Indirizzo o ricerca" />
        <button type="submit" className="btn primario">Vai</button>
      </form>
      {errore && <div className="avviso errore">{errore}</div>}
      <div className="colonna" style={{ gap: 8 }}>
        {siti?.map((s) => (
          <button key={s.nome + s.url} type="button" className="voce" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => void vai(s.url, s.nome)}>
            <Iniziale sito={s} />
            <span className="colonna" style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <span style={{ fontWeight: 600 }}>{s.nome}</span>
              <span className="tenue piccolo taglia">{s.url.replace(/^https?:\/\//, '')}</span>
            </span>
            <span className="tenue" aria-hidden="true">›</span>
          </button>
        ))}
      </div>
      <span className="tenue piccolo" style={{ lineHeight: 1.5 }}>
        {nativa ? 'Gli accessi ai tuoi account restano salvati nell\'app. ' : ''}
        Per ora il browser non legge le pagine: i lettori arrivano con i prossimi passi. I siti si cambiano in <Link to="/impostazioni">Impostazioni</Link>.
      </span>
    </main>
  )
}

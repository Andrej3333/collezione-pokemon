import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useArchivio } from '../archivio'
import { eliminaPosizione, nuovaPosizione, rinominaPosizione } from '../dati'
import { statoVoce } from '../importazione'
import { appNativa, elencoCampioni, eliminaCampione, leggiSiti, salvaSiti, scaricaCampione, SITI_PREDEFINITI, URL_APK, type Campione, type Sito } from '../browser'
import { supabase } from '../supabase'

export function Impostazioni() {
  const { posizioni, copie, voci, prezzi, ricarica } = useArchivio()
  const [email, setEmail] = useState('')
  const [nuova, setNuova] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [catalogo, setCatalogo] = useState<string>('')
  const [siti, setSiti] = useState<Sito[] | null>(null)
  const [sitiCambiati, setSitiCambiati] = useState(false)
  useEffect(() => { void leggiSiti().then(setSiti).catch(() => setSiti(SITI_PREDEFINITI)) }, [])
  const [campioni, setCampioni] = useState<Campione[]>([])
  const aggiornaCampioni = () => elencoCampioni().then(setCampioni).catch(() => setCampioni([]))
  useEffect(() => { void aggiornaCampioni() }, [])

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
    fetch(`${import.meta.env.BASE_URL}catalogo/meta.json`).then((r) => r.json()).then((m) => {
      const d = new Date(m.generato).toLocaleDateString('it-IT')
      const l = m.lingue || {}
      setCatalogo(`aggiornato il ${d}: ${l.en?.carte ?? '?'} carte inglesi, ${l.it?.carte ?? '?'} italiane, ${l.ja?.carte ?? '?'} giapponesi`)
    }).catch(() => setCatalogo('non disponibile'))
  }, [])

  async function esegui(f: () => Promise<unknown>) {
    setErrore(null)
    try { await f(); await ricarica() } catch (e) { setErrore((e as Error).message) }
  }

  return (
    <main className="pagina" style={{ maxWidth: 720 }}>
      <h1>Impostazioni</h1>
      {errore && <div className="avviso errore">{errore}</div>}

      <section className="scheda">
        <h2>Posizioni</h2>
        <span className="tenue piccolo">Dove tieni fisicamente le carte: raccoglitori, scatole, cassetti.</span>
        {posizioni.map((p) => (
          <div key={p.id} className="riga" style={{ gap: 8 }}>
            <input className="campo-libero" defaultValue={p.nome} aria-label="Nome della posizione"
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== p.nome) void esegui(() => rinominaPosizione(p.id, v)) }} />
            <span className="tenue piccolo" style={{ flex: 'none' }}>{copie.filter((c) => c.posizione_id === p.id).length}</span>
            <button type="button" className="btn icona pericolo" aria-label={`Elimina ${p.nome}`}
              onClick={() => { if (window.confirm(`Eliminare la posizione "${p.nome}"? Le carte restano, senza posizione.`)) void esegui(() => eliminaPosizione(p.id)) }}>✕</button>
          </div>
        ))}
        <form className="riga" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (nuova.trim()) void esegui(async () => { await nuovaPosizione(nuova.trim()); setNuova('') }) }}>
          <input className="campo-libero" value={nuova} onChange={(e) => setNuova(e.target.value)} placeholder="Nuova posizione" aria-label="Nuova posizione" />
          <button type="submit" className="btn">Aggiungi</button>
        </form>
      </section>

      <section className="scheda">
        <h2>Tasse di importazione</h2>
        <span className="tenue piccolo" style={{ lineHeight: 1.5 }}>Regole per stimare dazio, diritti e IVA degli ordini dal Giappone: {voci.filter((v) => statoVoce(v) === 'attiva').length} in vigore, {voci.filter((v) => statoVoce(v) === 'futura').length} in arrivo.</span>
        <Link className="btn" to="/impostazioni/tasse">Gestisci le regole</Link>
      </section>

      <section className="scheda">
        <h2>Catalogo delle carte</h2>
        <span className="tenue piccolo" style={{ lineHeight: 1.5 }}>Da TCGdex, {catalogo || '…'}. Si aggiorna da solo ogni settimana.</span>
      </section>

      <section className="scheda">
        <h2>Prezzi</h2>
        <span className="tenue piccolo" style={{ lineHeight: 1.5 }}>
          Cardmarket e TCGplayer, per le carte in collezione, in viaggio e in wantlist. Si aggiornano ogni notte.{' '}
          {prezzi.aggiornato ? `Ultimo aggiornamento: ${new Date(prezzi.aggiornato).toLocaleString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.` : 'Nessun aggiornamento ancora.'}
        </span>
      </section>

      <section className="scheda">
        <h2>Siti del browser</h2>
        <span className="tenue piccolo">L'elenco che trovi nella scheda Browser, uguale su tutti i dispositivi.</span>
        {siti?.map((s, i) => (
          <div key={i} className="colonna" style={{ gap: 6, paddingTop: 8, borderTop: '1px solid var(--bordo)' }}>
            <div className="riga" style={{ gap: 8 }}>
              <input className="campo-libero" value={s.nome} aria-label="Nome del sito" onChange={(e) => { setSiti(siti.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x))); setSitiCambiati(true) }} />
              <button type="button" className="btn icona pericolo" aria-label={`Togli ${s.nome}`} onClick={() => { setSiti(siti.filter((_, j) => j !== i)); setSitiCambiati(true) }}>✕</button>
            </div>
            <input className="campo-libero" value={s.url} inputMode="url" aria-label="Indirizzo del sito" onChange={(e) => { setSiti(siti.map((x, j) => (j === i ? { ...x, url: e.target.value } : x))); setSitiCambiati(true) }} />
          </div>
        ))}
        <div className="griglia-campi">
          <button type="button" className="btn" onClick={() => { setSiti([...(siti ?? []), { nome: 'Nuovo sito', url: 'https://' }]); setSitiCambiati(true) }}>+ Aggiungi un sito</button>
          <button type="button" className="btn" onClick={() => { setSiti(SITI_PREDEFINITI); setSitiCambiati(true) }}>Elenco predefinito</button>
        </div>
        {sitiCambiati && <button type="button" className="btn primario" onClick={() => void esegui(async () => { await salvaSiti((siti ?? []).filter((s) => s.nome.trim() && s.url.trim())); setSitiCambiati(false) })}>Salva i siti</button>}
      </section>

      {campioni.length > 0 && (
        <section className="scheda">
          <h2>Esempi di pagina</h2>
          <span className="tenue piccolo" style={{ lineHeight: 1.5 }}>
            Le pagine salvate con "Invia esempio" nel browser interno. Restano private nel tuo database: per farmi scrivere o sistemare un lettore, scaricale dal PC e allegale in chat.
          </span>
          {campioni.map((c) => {
            let host = c.url
            try { host = new URL(c.url).hostname.replace(/^www\./, '') } catch { /* indirizzo non valido */ }
            return (
              <div key={c.id} className="riga" style={{ gap: 8, paddingTop: 8, borderTop: '1px solid var(--bordo)' }}>
                <span className="colonna" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                  <span className="taglia" style={{ fontWeight: 600 }}>{c.titolo || host}</span>
                  <span className="tenue piccolo taglia">{host} · {new Date(c.creato).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </span>
                <button type="button" className="btn" style={{ flex: 'none' }} onClick={() => void esegui(() => scaricaCampione(c))}>Scarica</button>
                <button type="button" className="btn icona pericolo" aria-label="Elimina l'esempio" onClick={() => void esegui(async () => { await eliminaCampione(c.id); await aggiornaCampioni() })}>✕</button>
              </div>
            )
          })}
        </section>
      )}

      <section className="scheda">
        <h2>App Android</h2>
        {appNativa()
          ? <span className="tenue piccolo">Stai usando l'app Android. Se ti avviso di una nuova versione, scaricala da qui e aprila per aggiornare.</span>
          : <span className="tenue piccolo" style={{ lineHeight: 1.5 }}>Scaricala dal telefono e aprila per installarla. La prima volta Android ti chiede di consentire l'installazione da Chrome o dall'app File.</span>}
        <a className="btn" href={URL_APK}>Scarica l'app Android</a>
      </section>

      <section className="scheda">
        <h2>Account</h2>
        <span className="tenue">{email}</span>
        <button type="button" className="btn" onClick={() => void supabase.auth.signOut()}>Esci</button>
      </section>

      <span className="tenue piccolo">Versione 0.4, tappa 4, interfaccia del {new Date(__COSTRUITA__).toLocaleString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}{appNativa() ? ', app Android' : ''}. In arrivo: i lettori del browser interno e l'app Windows.</span>
    </main>
  )
}

export function InArrivo({ titolo, testo }: { titolo: string; testo: string }) {
  return (
    <main className="pagina">
      <h1>{titolo}</h1>
      <div className="vuoto">{testo}</div>
    </main>
  )
}

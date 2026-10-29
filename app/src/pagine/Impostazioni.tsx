import { useEffect, useState } from 'react'
import { useArchivio } from '../archivio'
import { eliminaPosizione, nuovaPosizione, rinominaPosizione } from '../dati'
import { supabase } from '../supabase'

export function Impostazioni() {
  const { posizioni, copie, ricarica } = useArchivio()
  const [email, setEmail] = useState('')
  const [nuova, setNuova] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [catalogo, setCatalogo] = useState<string>('')

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
        <h2>Catalogo delle carte</h2>
        <span className="tenue piccolo" style={{ lineHeight: 1.5 }}>Da TCGdex, {catalogo || '…'}. Si aggiorna da solo ogni settimana.</span>
      </section>

      <section className="scheda">
        <h2>Account</h2>
        <span className="tenue">{email}</span>
        <button type="button" className="btn" onClick={() => void supabase.auth.signOut()}>Esci</button>
      </section>

      <span className="tenue piccolo">Versione 0.1, tappa 1. In arrivo: scale di condizione, siti per la ricerca, proxy e cambi.</span>
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

import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useArchivio } from '../archivio'
import { Attesa, breveLingua, EtichettaStato, ImmagineCopia, Indietro } from '../comuni'
import type { Copia, Lingua, Stato } from '../tipi'
import { LINGUE } from '../tipi'

export function GrigliaCopie({ copie }: { copie: Copia[] }) {
  return (
    <div className="griglia-carte">
      {copie.map((c) => (
        <Link key={c.id} className="carta" to={`/carta/${c.id}`}>
          <ImmagineCopia copia={c} />
          <span className="colonna" style={{ gap: 2 }}>
            <span className="nome taglia">{c.nome}</span>
            <span className="tenue piccolo taglia">{c.set_nome || c.set_id}</span>
            <span className="tenue piccolo taglia">{c.numero} · {breveLingua(c.lingua)} · {c.gradata ? `${c.ente ?? ''} ${c.voto ?? ''}`.trim() : c.condizione}</span>
          </span>
          <EtichettaStato stato={c.stato} />
        </Link>
      ))}
    </div>
  )
}

export function TutteLeCarte() {
  const { copie, posizioni, caricato } = useArchivio()
  const [params] = useSearchParams()
  const posizione = params.get('posizione')
  const [stato, setStato] = useState<Stato | ''>('')
  const [lingua, setLingua] = useState<Lingua | ''>('')
  const [ordine, setOrdine] = useState('recenti')
  const [testo, setTesto] = useState('')

  const elenco = useMemo(() => {
    const t = testo.trim().toLowerCase()
    const r = copie.filter((c) =>
      (stato ? c.stato === stato : c.stato !== 'venduta') &&
      (!lingua || c.lingua === lingua) &&
      (!posizione || (posizione === 'nessuna' ? !c.posizione_id : c.posizione_id === posizione)) &&
      (!t || `${c.nome} ${c.numero} ${c.set_nome ?? ''} ${c.set_id}`.toLowerCase().includes(t)))
    if (ordine === 'nome') r.sort((a, b) => a.nome.localeCompare(b.nome))
    if (ordine === 'set') r.sort((a, b) => (a.set_id + a.numero.padStart(4, '0')).localeCompare(b.set_id + b.numero.padStart(4, '0')))
    return r
  }, [copie, stato, lingua, ordine, testo, posizione])

  if (!caricato) return <main className="pagina"><Attesa /></main>
  const nomePos = posizione === 'nessuna' ? 'Senza posizione' : posizioni.find((p) => p.id === posizione)?.nome

  return (
    <main className="pagina">
      <Indietro to="/">Collezioni</Indietro>
      <div className="riga tra">
        <h1>{nomePos ? nomePos : 'Tutte le carte'}</h1>
        <Link className="btn primario" to="/aggiungi">Aggiungi</Link>
      </div>
      <input className="campo-libero" type="search" placeholder="Cerca nome, numero o set" aria-label="Cerca carta"
        value={testo} onChange={(e) => setTesto(e.target.value)} />
      <div className="chips">
        {([['', 'Tutte'], ['collezione', 'In collezione'], ['viaggio', 'In viaggio'], ['venduta', 'Vendute']] as [Stato | '', string][]).map(([id, nome]) => (
          <button key={id} type="button" className={`chip ${stato === id ? 'attivo' : ''}`} aria-pressed={stato === id} onClick={() => setStato(id)}>{nome}</button>
        ))}
      </div>
      <div className="griglia-campi">
        <label className="campo">Lingua
          <select value={lingua} onChange={(e) => setLingua(e.target.value as Lingua | '')}>
            <option value="">Tutte</option>
            {LINGUE.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </label>
        <label className="campo">Ordina per
          <select value={ordine} onChange={(e) => setOrdine(e.target.value)}>
            <option value="recenti">Aggiunte di recente</option>
            <option value="nome">Nome</option>
            <option value="set">Set e numero</option>
          </select>
        </label>
      </div>
      {elenco.length === 0
        ? <div className="vuoto">{copie.length === 0 ? <>Ancora nessuna carta.<br />Tocca <b>Aggiungi</b> per inserire la prima.</> : 'Nessuna carta con questi filtri.'}</div>
        : <GrigliaCopie copie={elenco} />}
    </main>
  )
}

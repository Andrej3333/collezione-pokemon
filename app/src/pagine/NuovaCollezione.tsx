import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useArchivio } from '../archivio'
import { caricaCatalogo, type SetCatalogo } from '../catalogo'
import { Indietro } from '../comuni'
import { nuovaCollezione } from '../dati'
import type { Lingua, Regole, TipoCollezione } from '../tipi'
import { LINGUE } from '../tipi'

const TIPI: { id: TipoCollezione; titolo: string; descrizione: string }[] = [
  { id: 'manuale', titolo: 'Scelgo io le carte', descrizione: 'Una raccolta a tema: per Pokémon, illustratore, ricordi, qualsiasi cosa.' },
  { id: 'automatica', titolo: 'Automatica, con delle regole', descrizione: 'Si aggiorna da sola: per esempio tutte le giapponesi, o tutte le gradate.' },
  { id: 'set', titolo: 'Un set da completare', descrizione: 'Mostra quante carte del set hai e quali mancano.' },
]

export function NuovaCollezione() {
  const navigate = useNavigate()
  const { ricarica } = useArchivio()
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoCollezione>('manuale')
  const [regole, setRegole] = useState<Regole>({ lingua: '', gradata: '', pokemon: '', rarita: '' })
  const [lingua, setLingua] = useState<Lingua>('en')
  const [sets, setSets] = useState<SetCatalogo[]>([])
  const [setId, setSetId] = useState('')
  const [filtroSet, setFiltroSet] = useState('')
  const [prefisso, setPrefisso] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  useEffect(() => {
    if (tipo !== 'set') return
    caricaCatalogo(lingua).then((c) => setSets([...c.sets].reverse()), (e) => setErrore((e as Error).message))
  }, [tipo, lingua])

  const setScelto = sets.find((s) => s.id === setId)
  const setFiltrati = sets.filter((s) => !filtroSet || `${s.nome} ${s.id}`.toLowerCase().includes(filtroSet.toLowerCase()))

  async function crea(e: React.FormEvent) {
    e.preventDefault()
    if (tipo === 'set' && !setScelto) { setErrore('Scegli il set.'); return }
    setInvio(true)
    setErrore(null)
    try {
      const col = await nuovaCollezione({
        nome: nome.trim() || (tipo === 'set' && setScelto ? setScelto.nome : 'Nuova collezione'),
        tipo,
        regole: tipo === 'automatica' ? regole : tipo === 'set' && prefisso.trim() ? { prefisso: prefisso.trim() } : {},
        set_id: tipo === 'set' ? setScelto!.id : null,
        set_nome: tipo === 'set' ? setScelto!.nome : null,
        lingua: tipo === 'set' ? lingua : null,
      })
      await ricarica()
      navigate(`/collezione/${col.id}`, { replace: true })
    } catch (err) {
      setErrore((err as Error).message)
      setInvio(false)
    }
  }

  return (
    <main className="pagina" style={{ maxWidth: 720 }}>
      <Indietro to="/">Collezioni</Indietro>
      <h1>Nuova collezione</h1>
      <form className="colonna" style={{ gap: 16 }} onSubmit={crea}>
        <label className="campo">Nome
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder={tipo === 'set' ? 'Se lo lasci vuoto uso il nome del set' : 'Es. Evoluzioni di Eevee'} />
        </label>

        <fieldset className="colonna" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="tenue" style={{ marginBottom: 8, fontSize: 14 }}>Come si riempie</legend>
          {TIPI.map((t) => (
            <label key={t.id} className="voce" style={{ alignItems: 'flex-start', cursor: 'pointer', borderColor: tipo === t.id ? 'var(--accento)' : undefined, background: tipo === t.id ? 'var(--blu-f)' : undefined }}>
              <input type="radio" name="tipo" checked={tipo === t.id} onChange={() => setTipo(t.id)} style={{ width: 20, height: 20, marginTop: 2, accentColor: 'var(--accento)' }} />
              <span className="colonna" style={{ gap: 3 }}>
                <span style={{ fontWeight: 600 }}>{t.titolo}</span>
                <span className="tenue piccolo" style={{ lineHeight: 1.5 }}>{t.descrizione}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {tipo === 'manuale' && (
          <div className="avviso">Dopo averla creata, aggiungi le carte dalla loro scheda o dal pulsante nella collezione. Una carta può stare in più collezioni.</div>
        )}

        {tipo === 'automatica' && (
          <div className="scheda">
            <span className="tenue piccolo">Entrano da sole le carte che rispettano tutte le regole compilate.</span>
            <div className="griglia-campi">
              <label className="campo">Lingua
                <select value={regole.lingua} onChange={(e) => setRegole({ ...regole, lingua: e.target.value as Lingua | '' })}>
                  <option value="">Qualsiasi</option>
                  {LINGUE.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                </select>
              </label>
              <label className="campo">Gradata
                <select value={regole.gradata} onChange={(e) => setRegole({ ...regole, gradata: e.target.value as Regole['gradata'] })}>
                  <option value="">Indifferente</option>
                  <option value="si">Solo gradate</option>
                  <option value="no">Solo non gradate</option>
                </select>
              </label>
              <label className="campo">Il nome contiene
                <input value={regole.pokemon} onChange={(e) => setRegole({ ...regole, pokemon: e.target.value })} placeholder="Es. Eevee" />
              </label>
              <label className="campo">La rarità contiene
                <input value={regole.rarita} onChange={(e) => setRegole({ ...regole, rarita: e.target.value })} placeholder="Es. Illustration" />
              </label>
            </div>
          </div>
        )}

        {tipo === 'set' && (
          <div className="scheda">
            <label className="campo">Lingua
              <select value={lingua} onChange={(e) => { setLingua(e.target.value as Lingua); setSetId('') }}>
                {LINGUE.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </label>
            <label className="campo">Cerca il set
              <input value={filtroSet} onChange={(e) => setFiltroSet(e.target.value)} placeholder="Nome o codice, es. Generations o g1" />
            </label>
            <div className="lista-scelta" role="listbox" aria-label="Set">
              {setFiltrati.slice(0, 40).map((s) => (
                <button key={s.id} type="button" role="option" aria-selected={s.id === setId} className={s.id === setId ? 'attivo' : ''} onClick={() => setSetId(s.id)}>
                  <span className={lingua === 'ja' ? 'jp' : ''}>{s.nome}</span> <span className="tenue piccolo">({s.id}{s.totale ? `, ${s.totale} carte` : ''})</span>
                </button>
              ))}
              {setFiltrati.length > 40 && <span className="tenue piccolo">Altri {setFiltrati.length - 40} set: scrivi qualcosa per restringere.</span>}
            </div>
            <label className="campo">Solo una parte del set (facoltativo)
              <input value={prefisso} onChange={(e) => setPrefisso(e.target.value)} placeholder="Numeri che iniziano con, es. RC" />
            </label>
            {setScelto && <span className="tenue piccolo">Scelto: {setScelto.nome}</span>}
          </div>
        )}

        {errore && <div className="avviso errore">{errore}</div>}
        <button className="btn primario" type="submit" disabled={invio}>{invio ? 'Creazione…' : 'Crea collezione'}</button>
      </form>
    </main>
  )
}

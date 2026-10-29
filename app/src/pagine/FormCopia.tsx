import { useState } from 'react'
import { useArchivio } from '../archivio'
import { nuovaPosizione } from '../dati'
import type { Copia, Stato } from '../tipi'
import { CONDIZIONI, STATI } from '../tipi'

export type ValoriCopia = Pick<Copia,
  'stato' | 'condizione' | 'gradata' | 'ente' | 'voto' | 'certificato' | 'protezione' |
  'posizione_id' | 'pagina' | 'prezzo_pagato' | 'data_arrivo' | 'note'>

export const VALORI_INIZIALI: ValoriCopia = {
  stato: 'collezione', condizione: 'NM', gradata: false, ente: null, voto: null, certificato: null,
  protezione: 'Doppia bustina e toploader', posizione_id: null, pagina: null, prezzo_pagato: null,
  data_arrivo: new Date().toISOString().slice(0, 10), note: null,
}

export function soloValori(c: ValoriCopia): ValoriCopia {
  const k = Object.keys(VALORI_INIZIALI) as (keyof ValoriCopia)[]
  return Object.fromEntries(k.map((x) => [x, c[x]])) as unknown as ValoriCopia
}

const vuotoNull = (s: string) => (s.trim() === '' ? null : s)

export function FormCopia(props: {
  iniziali: ValoriCopia
  collezioniIniziali: string[]
  etichettaSalva: string
  onSalva: (v: ValoriCopia, collezioni: string[]) => Promise<void>
}) {
  const { collezioni, posizioni, ricarica } = useArchivio()
  const manuali = collezioni.filter((c) => c.tipo === 'manuale')
  const [v, setV] = useState<ValoriCopia>(props.iniziali)
  const [scelte, setScelte] = useState<string[]>(props.collezioniIniziali)
  const [nuovaPos, setNuovaPos] = useState('')
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const set = <K extends keyof ValoriCopia>(k: K, x: ValoriCopia[K]) => setV((p) => ({ ...p, [k]: x }))

  async function salva(e: React.FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    try {
      let valori = v
      if (v.posizione_id === '__nuova') {
        const p = await nuovaPosizione(nuovaPos.trim() || 'Nuova posizione')
        valori = { ...v, posizione_id: p.id }
        await ricarica()
      }
      await props.onSalva(valori, scelte)
    } catch (err) {
      setErrore((err as Error).message)
      setInvio(false)
    }
  }

  return (
    <form className="colonna" style={{ gap: 14 }} onSubmit={salva}>
      <div className="griglia-campi">
        <label className="campo">Stato
          <select value={v.stato} onChange={(e) => set('stato', e.target.value as Stato)}>
            {STATI.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </label>
        <label className="campo">Condizione
          <select value={v.condizione} onChange={(e) => set('condizione', e.target.value)}>
            {CONDIZIONI.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
      </div>

      <label className="spunta"><input type="checkbox" checked={v.gradata} onChange={(e) => set('gradata', e.target.checked)} />Gradata</label>
      {v.gradata && (
        <div className="griglia-campi">
          <label className="campo">Ente
            <input list="enti" value={v.ente ?? ''} onChange={(e) => set('ente', vuotoNull(e.target.value))} placeholder="PSA, CGC, BGS…" />
            <datalist id="enti"><option value="PSA" /><option value="CGC" /><option value="BGS" /><option value="ACE" /><option value="ARS" /></datalist>
          </label>
          <label className="campo">Voto<input value={v.voto ?? ''} onChange={(e) => set('voto', vuotoNull(e.target.value))} placeholder="10" /></label>
          <label className="campo">Certificato<input value={v.certificato ?? ''} onChange={(e) => set('certificato', vuotoNull(e.target.value))} /></label>
        </div>
      )}

      <div className="griglia-campi">
        <label className="campo">Protezione<input value={v.protezione ?? ''} onChange={(e) => set('protezione', vuotoNull(e.target.value))} /></label>
        <label className="campo">Posizione
          <select value={v.posizione_id ?? ''} onChange={(e) => set('posizione_id', e.target.value || null)}>
            <option value="">Nessuna</option>
            {posizioni.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            <option value="__nuova">+ Nuova posizione…</option>
          </select>
        </label>
        {v.posizione_id === '__nuova' && (
          <label className="campo">Nome della posizione<input value={nuovaPos} onChange={(e) => setNuovaPos(e.target.value)} placeholder="Raccoglitore toploader" /></label>
        )}
        <label className="campo">Pagina o scomparto<input value={v.pagina ?? ''} onChange={(e) => set('pagina', vuotoNull(e.target.value))} /></label>
      </div>

      <div className="griglia-campi">
        <label className="campo">Pagata (€)
          <input type="number" inputMode="decimal" step="0.01" min="0" value={v.prezzo_pagato ?? ''}
            onChange={(e) => set('prezzo_pagato', e.target.value === '' ? null : Number(e.target.value))} />
        </label>
        <label className="campo">Arrivata il
          <input type="date" value={v.data_arrivo ?? ''} onChange={(e) => set('data_arrivo', e.target.value || null)} />
        </label>
      </div>

      {manuali.length > 0 && (
        <fieldset className="colonna" style={{ border: 0, padding: 0, margin: 0, gap: 0 }}>
          <legend className="tenue piccolo" style={{ marginBottom: 4 }}>Nelle collezioni scelte da te</legend>
          {manuali.map((c) => (
            <label key={c.id} className="spunta">
              <input type="checkbox" checked={scelte.includes(c.id)}
                onChange={(e) => setScelte((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))} />
              {c.nome}
            </label>
          ))}
          <span className="tenue piccolo">Le collezioni automatiche e i set la includono da soli.</span>
        </fieldset>
      )}

      <label className="campo">Note<textarea value={v.note ?? ''} onChange={(e) => set('note', vuotoNull(e.target.value))} /></label>
      {errore && <div className="avviso errore">{errore}</div>}
      <button className="btn primario" type="submit" disabled={invio}>{invio ? 'Salvataggio…' : props.etichettaSalva}</button>
    </form>
  )
}

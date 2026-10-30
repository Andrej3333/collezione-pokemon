import { useState } from 'react'
import { useArchivio } from '../archivio'
import { nuovaPosizione } from '../dati'
import type { Copia, Lingua, Stato } from '../tipi'
import { CONDIZIONI, STATI, VARIANTI, oggiLocale } from '../tipi'

export type ValoriCopia = Pick<Copia,
  'stato' | 'condizione' | 'variante' | 'gradata' | 'ente' | 'voto' | 'certificato' | 'protezione' |
  'posizione_id' | 'pagina' | 'prezzo_pagato' | 'data_arrivo' | 'note' | 'prezzo_vendita' | 'data_vendita' | 'lingua'>

export const VALORI_INIZIALI: ValoriCopia = {
  stato: 'collezione', condizione: 'NM', variante: null, gradata: false, ente: null, voto: null, certificato: null,
  protezione: 'Doppia bustina e toploader', posizione_id: null, pagina: null, prezzo_pagato: null,
  data_arrivo: oggiLocale(), note: null, prezzo_vendita: null, data_vendita: null, lingua: 'en',
}

export function soloValori(c: ValoriCopia): ValoriCopia {
  const k = Object.keys(VALORI_INIZIALI) as (keyof ValoriCopia)[]
  return Object.fromEntries(k.map((x) => [x, c[x]])) as unknown as ValoriCopia
}

const vuotoNull = (s: string) => (s.trim() === '' ? null : s)

export function FormCopia(props: {
  iniziali: ValoriCopia
  variantiSuggerite?: string[]
  collezioniIniziali: string[]
  etichettaSalva: string
  conQuantita?: boolean
  lingue?: Lingua[] // lingue tra cui si può scegliere (inglese e italiano hanno le stesse carte)
  onSalva: (v: ValoriCopia, collezioni: string[], quantita: number) => Promise<void>
}) {
  const { collezioni, posizioni, ricarica } = useArchivio()
  const manuali = collezioni.filter((c) => c.tipo === 'manuale')
  const [v, setV] = useState<ValoriCopia>(props.iniziali)
  const [scelte, setScelte] = useState<string[]>(props.collezioniIniziali)
  const [nuovaPos, setNuovaPos] = useState('')
  const [quantita, setQuantita] = useState(1)
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
      await props.onSalva(valori, scelte, props.conQuantita ? Math.max(1, Math.min(50, quantita || 1)) : 1)
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

      {v.stato === 'venduta' && (
        <div className="griglia-campi">
          <label className="campo">Venduta a (€)
            <input type="number" inputMode="decimal" step="0.01" min="0" value={v.prezzo_vendita ?? ''}
              onChange={(e) => set('prezzo_vendita', e.target.value === '' ? null : Number(e.target.value))} />
          </label>
          <label className="campo">Venduta il
            <input type="date" value={v.data_vendita ?? ''} onChange={(e) => set('data_vendita', e.target.value || null)} />
          </label>
        </div>
      )}

      {props.lingue && props.lingue.length > 1 && (
        <div className="colonna" style={{ gap: 6 }}>
          <span style={{ fontSize: 14, color: 'var(--testo2)' }}>Lingua della tua copia</span>
          <div className="chips" role="group" aria-label="Lingua della copia">
            {props.lingue.map((l) => (
              <button key={l} type="button" className={`chip ${v.lingua === l ? 'attivo' : ''}`} aria-pressed={v.lingua === l} onClick={() => set('lingua', l)}>
                {l === 'en' ? 'Inglese' : l === 'it' ? 'Italiano' : 'Giapponese'}
              </button>
            ))}
          </div>
        </div>
      )}

      <CampoVariante valore={v.variante} suggerite={props.variantiSuggerite ?? []} onCambia={(x) => set('variante', x)} />

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
      {props.conQuantita && (
        <label className="campo">Quantità
          <input type="number" inputMode="numeric" min="1" max="50" step="1" value={quantita || ''} onChange={(e) => setQuantita(Number(e.target.value))} />
          <span className="tenue piccolo">Con più di 1 crea copie separate con gli stessi dati: poi puoi modificarle una per una.</span>
        </label>
      )}
      {errore && <div className="avviso errore">{errore}</div>}
      <button className="btn primario" type="submit" disabled={invio}>{invio ? 'Salvataggio…' : props.conQuantita && quantita > 1 ? `${props.etichettaSalva} (${quantita} copie)` : props.etichettaSalva}</button>
    </form>
  )
}

// Variante: le varianti suggerite per la carta come pulsanti, piu un campo libero per i casi particolari.
export function CampoVariante({ valore, suggerite, onCambia }: { valore: string | null; suggerite: string[]; onCambia: (v: string | null) => void }) {
  return (
    <div className="colonna" style={{ gap: 6 }}>
      <span style={{ fontSize: 14, color: 'var(--testo2)' }}>Variante</span>
      {suggerite.length > 0 && (
        <div className="chips" role="group" aria-label="Varianti della carta">
          {suggerite.map((x) => (
            <button key={x} type="button" className={`chip ${valore === x ? 'attivo' : ''}`} aria-pressed={valore === x} onClick={() => onCambia(valore === x ? null : x)}>{x}</button>
          ))}
        </div>
      )}
      <input className="campo-libero" list="varianti" aria-label="Variante, testo libero" value={valore ?? ''}
        onChange={(e) => onCambia(e.target.value.trim() === '' ? null : e.target.value)}
        placeholder="Altra variante, es. Shadowless, timbro, errore di stampa" />
      <datalist id="varianti">{VARIANTI.map((x) => <option key={x} value={x} />)}</datalist>
    </div>
  )
}

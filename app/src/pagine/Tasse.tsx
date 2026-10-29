import { useState } from 'react'
import { useArchivio } from '../archivio'
import { Attesa, Indietro } from '../comuni'
import { aggiornaVoce, eliminaVoce, nuovaVoce, ripristinaVoci } from '../dati'
import { condizioniVoce, descriviVoce, statoVoce, stimaImportazione } from '../importazione'
import type { CategoriaVoce, VoceImportazione } from '../tipi'
import { CATEGORIE_VOCE } from '../tipi'

const euro = (n: number) => `€ ${n.toFixed(2).replace('.', ',')}`
const STATI = {
  attiva: ['In vigore', 'verde'],
  futura: ['In arrivo', 'blu'],
  scaduta: ['Scaduta', ''],
  spenta: ['Disattivata', ''],
} as const

type Bozza = Omit<VoceImportazione, 'id' | 'created_at'>
const NUOVA: Bozza = {
  nome: '', categoria: 'diritti', calcolo: 'fisso', valore: 0, base_iva: true,
  valore_min: null, valore_max: null, corriere: null, dal: null, al: null, attiva: true, note: null,
}
const numONull = (v: string) => (v === '' ? null : Number(v))

function ModuloVoce({ iniziale, onSalva, onElimina, onAnnulla }: {
  iniziale: Bozza
  onSalva: (b: Bozza) => void
  onElimina?: () => void
  onAnnulla: () => void
}) {
  const [b, setB] = useState<Bozza>(iniziale)
  const set = (x: Partial<Bozza>) => setB((v) => ({ ...v, ...x }))
  return (
    <form className="colonna" style={{ gap: 12, paddingTop: 12, borderTop: '1px solid var(--bordo)' }}
      onSubmit={(e) => { e.preventDefault(); if (b.nome.trim()) onSalva({ ...b, nome: b.nome.trim() }) }}>
      <label className="campo">Nome<input value={b.nome} onChange={(e) => set({ nome: e.target.value })} required /></label>
      <div className="chips" role="group" aria-label="Tipo di voce">
        {CATEGORIE_VOCE.map((c) => (
          <button key={c.id} type="button" className={`chip ${b.categoria === c.id ? 'attivo' : ''}`} aria-pressed={b.categoria === c.id}
            onClick={() => set({ categoria: c.id as CategoriaVoce })}>{c.nome}</button>
        ))}
      </div>
      <div className="chips" role="group" aria-label="Calcolo">
        <button type="button" className={`chip ${b.calcolo === 'fisso' ? 'attivo' : ''}`} aria-pressed={b.calcolo === 'fisso'} onClick={() => set({ calcolo: 'fisso' })}>Importo fisso</button>
        <button type="button" className={`chip ${b.calcolo === 'percentuale' ? 'attivo' : ''}`} aria-pressed={b.calcolo === 'percentuale'} onClick={() => set({ calcolo: 'percentuale' })}>Percentuale</button>
      </div>
      <div className="griglia-campi">
        <label className="campo">{b.calcolo === 'fisso' ? 'Importo (€)' : 'Percentuale (%)'}
          <input type="number" inputMode="decimal" step="0.01" min="0" value={b.valore} onChange={(e) => set({ valore: Number(e.target.value || 0) })} />
        </label>
        <label className="campo">Solo con il corriere
          <input value={b.corriere ?? ''} placeholder="tutti" onChange={(e) => set({ corriere: e.target.value || null })} />
        </label>
        <label className="campo">Merce oltre (€)
          <input type="number" inputMode="decimal" step="0.01" min="0" value={b.valore_min ?? ''} placeholder="nessun limite" onChange={(e) => set({ valore_min: numONull(e.target.value) })} />
        </label>
        <label className="campo">Merce fino a (€)
          <input type="number" inputMode="decimal" step="0.01" min="0" value={b.valore_max ?? ''} placeholder="nessun limite" onChange={(e) => set({ valore_max: numONull(e.target.value) })} />
        </label>
        <label className="campo">In vigore dal<input type="date" value={b.dal ?? ''} onChange={(e) => set({ dal: e.target.value || null })} /></label>
        <label className="campo">Fino al (escluso)<input type="date" value={b.al ?? ''} onChange={(e) => set({ al: e.target.value || null })} /></label>
      </div>
      {b.categoria !== 'iva' && (
        <label className="spunta"><input type="checkbox" checked={b.base_iva} onChange={(e) => set({ base_iva: e.target.checked })} />Si paga l'IVA anche su questa voce</label>
      )}
      <label className="spunta"><input type="checkbox" checked={b.attiva} onChange={(e) => set({ attiva: e.target.checked })} />Attiva</label>
      <label className="campo">Note<textarea value={b.note ?? ''} onChange={(e) => set({ note: e.target.value || null })} /></label>
      <div className="griglia-campi">
        <button type="button" className="btn" onClick={onAnnulla}>Annulla</button>
        <button type="submit" className="btn primario">Salva</button>
      </div>
      {onElimina && <button type="button" className="btn pericolo" onClick={onElimina}>Elimina la voce</button>}
    </form>
  )
}

export function Tasse() {
  const { voci, caricato, ricarica } = useArchivio()
  const [aperta, setAperta] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [prova, setProva] = useState({ merce: 80, spedizione: 15, data: new Date().toISOString().slice(0, 10) })
  if (!caricato) return <main className="pagina"><Attesa /></main>

  async function esegui(f: () => Promise<unknown>) {
    setErrore(null)
    try { await f(); setAperta(null); await ricarica() } catch (e) { setErrore((e as Error).message) }
  }

  const ordinate = [...voci].sort((a, b) => ['iva', 'dazio', 'diritti'].indexOf(a.categoria) - ['iva', 'dazio', 'diritti'].indexOf(b.categoria))
  const stima = stimaImportazione({ tipo: 'giappone', data: prova.data, data_arrivo: prova.data, spedizione: prova.spedizione, corriere: null, iva_al_sito: false, dazio: null }, prova.merce, voci)

  return (
    <main className="pagina" style={{ maxWidth: 720 }}>
      <Indietro to="/impostazioni">Impostazioni</Indietro>
      <h1>Tasse di importazione</h1>
      <span className="tenue" style={{ lineHeight: 1.5 }}>
        Le regole con cui l'app stima dazio, diritti e IVA degli ordini dal Giappone. Per ogni ordine vale la regola in vigore alla data di arrivo del pacco (o di oggi, se non è ancora arrivato).
      </span>
      {errore && <div className="avviso errore">{errore}</div>}

      {ordinate.map((v) => {
        const [testo, colore] = STATI[statoVoce(v)]
        return (
          <section key={v.id} className="scheda" style={{ gap: 8 }}>
            <button type="button" onClick={() => setAperta(aperta === v.id ? null : v.id)}
              style={{ background: 'transparent', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="riga tra" style={{ alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontWeight: 600 }}>{v.nome}</span>
                <span className={`etichetta ${colore}`}>{testo}</span>
              </span>
              <span className="mono">{descriviVoce(v)}</span>
              {condizioniVoce(v) && <span className="tenue piccolo">{condizioniVoce(v)}</span>}
              {v.note && aperta !== v.id && <span className="tenue piccolo" style={{ lineHeight: 1.45 }}>{v.note}</span>}
            </button>
            {aperta === v.id && (
              <ModuloVoce iniziale={v} onAnnulla={() => setAperta(null)}
                onSalva={(b) => void esegui(() => aggiornaVoce(v.id, b))}
                onElimina={() => { if (window.confirm(`Eliminare "${v.nome}"?`)) void esegui(() => eliminaVoce(v.id)) }} />
            )}
          </section>
        )
      })}

      {aperta === 'nuova' ? (
        <section className="scheda">
          <h2>Nuova voce</h2>
          <ModuloVoce iniziale={NUOVA} onAnnulla={() => setAperta(null)} onSalva={(b) => void esegui(() => nuovaVoce(b))} />
        </section>
      ) : (
        <button type="button" className="btn contorno" onClick={() => setAperta('nuova')}>+ Nuova voce</button>
      )}

      <section className="scheda">
        <h2>Prova il calcolo</h2>
        <div className="griglia-campi">
          <label className="campo">Carte (€)<input type="number" inputMode="decimal" min="0" value={prova.merce} onChange={(e) => setProva({ ...prova, merce: Number(e.target.value || 0) })} /></label>
          <label className="campo">Spedizione (€)<input type="number" inputMode="decimal" min="0" value={prova.spedizione} onChange={(e) => setProva({ ...prova, spedizione: Number(e.target.value || 0) })} /></label>
          <label className="campo">Arrivo<input type="date" value={prova.data} onChange={(e) => setProva({ ...prova, data: e.target.value || prova.data })} /></label>
        </div>
        <div className="colonna" style={{ gap: 6 }}>
          {stima.righe.filter((r) => r.importo > 0).map((r) => (
            <div key={r.voce.id} className="riga tra tenue"><span>{r.voce.nome}</span><span className="mono">{euro(r.importo)}</span></div>
          ))}
          <div className="riga tra" style={{ fontWeight: 600 }}><span>Tasse stimate</span><span className="mono">{euro(stima.dazio + stima.diritti + stima.iva)}</span></div>
        </div>
      </section>

      <button type="button" className="btn" onClick={() => { if (window.confirm('Rimettere le voci predefinite? Le tue modifiche a queste regole vanno perse.')) void esegui(() => ripristinaVoci(voci)) }}>Ripristina le voci predefinite</button>
      <span className="tenue piccolo" style={{ lineHeight: 1.5 }}>Le voci predefinite seguono le regole di fine ottobre 2026. Le commissioni di sdoganamento del corriere non sono tasse ufficiali: aggiungile come voce "Diritti e sdoganamento" con il nome del corriere.</span>
    </main>
  )
}

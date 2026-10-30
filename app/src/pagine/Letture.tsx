import { useEffect, useState } from 'react'
import { apri } from '../browser'
import { descriviOfferta, migliorOfferta, nomeLingua, riepilogo, ultimaLettura, codiceLingua, type Lettura } from '../letture'
import { euro } from '../prezzi'
import { linkRicerca, siglaSet } from '../ricerca'
import type { Lingua } from '../tipi'

// Sezione "Letture da Cardmarket": l'ultima lettura fatta con il browser interno.
export function LettureCardmarket({ cm, carta, condizione, desiderio }: {
  cm: number | null
  carta: { carta_id: string; lingua: Lingua; nome: string; numero: string; set_id: string; set_nome: string | null }
  condizione?: string | null // della tua copia
  desiderio?: { condizioneMin: string | null; prezzoMax: number | null } | null
}) {
  const [l, setL] = useState<Lettura | null | undefined>(undefined)
  const [sigla, setSigla] = useState('')
  useEffect(() => {
    let vivo = true
    setL(undefined)
    void ultimaLettura(cm, carta.carta_id, carta.lingua).then((x) => { if (vivo) setL(x) }).catch(() => { if (vivo) setL(null) })
    void siglaSet(carta.set_id, carta.lingua).then((s) => { if (vivo) setSigla(s) })
    return () => { vivo = false }
  }, [cm, carta.carta_id, carta.lingua, carta.set_id])

  const cercaUrl = linkRicerca(carta, sigla).find((x) => x.sito === 'Cardmarket')?.url
  if (l === undefined) return null

  if (!l) {
    return (
      <section className="scheda">
        <h2>Letture da Cardmarket</h2>
        <span className="tenue piccolo" style={{ lineHeight: 1.5 }}>Nessuna lettura ancora. Apri la pagina della carta su Cardmarket con il browser interno dell'app: le offerte per lingua e condizione si salvano da sole.</span>
        {cercaUrl && <button type="button" className="btn" onClick={() => void apri(cercaUrl, 'Cardmarket')}>Cerca su Cardmarket</button>}
      </section>
    )
  }

  const r = riepilogo(l.offerte)
  const q = l.riquadro
  const mia = migliorOfferta(l.offerte, { lingua: carta.lingua, condizioneMin: condizione ?? null })
  const voluta = desiderio ? migliorOfferta(l.offerte, { lingua: carta.lingua, condizioneMin: desiderio.condizioneMin }) : null
  const sottoMax = voluta && desiderio?.prezzoMax != null && voluta.prezzo! <= desiderio.prezzoMax

  return (
    <section className="scheda">
      <h2>Letture da Cardmarket</h2>
      <span className="tenue piccolo">
        Letta il {new Date(l.creato).toLocaleString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}: {r.totale} offerte visibili sulla pagina, con i filtri che avevi impostato.
      </span>

      {desiderio && (voluta
        ? <div className="avviso" style={sottoMax ? { background: 'var(--verde-f)', color: 'var(--verde)' } : undefined}>
            {sottoMax ? 'Offerta sotto il tuo massimo' : 'Migliore offerta con i tuoi requisiti'}: <span className="mono">{euro(voluta.prezzo)}</span> ({descriviOfferta(voluta)}), venditore {voluta.venditore}
          </div>
        : <div className="avviso">Nessuna offerta letta rispetta lingua e condizione che cerchi.</div>)}
      {!desiderio && mia && (
        <div className="avviso">Come la tua copia ({nomeLingua(carta.lingua)}{condizione ? `, ${condizione} o meglio` : ''}): da <span className="mono">{euro(mia.prezzo)}</span> ({descriviOfferta(mia)})</div>
      )}

      <div className="dati">
        {q.da != null && <div><div className="lbl">Da</div><span className="mono">{euro(q.da)}</span></div>}
        {q.tendenza != null && <div><div className="lbl">Tendenza</div><span className="mono">{euro(q.tendenza)}</span></div>}
        {q.media30 != null && <div><div className="lbl">Media 30 giorni</div><span className="mono">{euro(q.media30)}</span></div>}
        {q.media7 != null && <div><div className="lbl">Media 7 giorni</div><span className="mono">{euro(q.media7)}</span></div>}
        {q.media1 != null && <div><div className="lbl">Media 1 giorno</div><span className="mono">{euro(q.media1)}</span></div>}
        {q.disponibili != null && <div><div className="lbl">Articoli in vendita</div><span className="mono">{q.disponibili}</span></div>}
      </div>

      {r.tabella.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 13, minWidth: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 8px 6px 0', color: 'var(--tenue)', fontWeight: 400 }}>Prezzo più basso</th>
                {r.condizioni.map((c) => <th key={c} style={{ padding: '6px 8px', color: 'var(--tenue)', fontWeight: 400, textAlign: 'right' }}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {r.tabella.map((riga) => (
                <tr key={riga.lingua} style={{ borderTop: '1px solid var(--bordo)', fontWeight: riga.lingua === carta.lingua ? 600 : 400 }}>
                  <td style={{ padding: '6px 8px 6px 0', whiteSpace: 'nowrap' }}>{nomeLingua(riga.lingua)} <span className="tenue">({riga.offerte})</span></td>
                  {r.condizioni.map((c) => <td key={c} className="mono" style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{riga.perCondizione[c] != null ? euro(riga.perCondizione[c]).replace('€ ', '') : ''}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {l.offerte.some((o) => codiceLingua(o.lingua) === carta.lingua) === false && r.totale > 0 && (
        <span className="tenue piccolo">Nessuna offerta in {nomeLingua(carta.lingua).toLowerCase()} tra quelle lette: forse avevi un filtro di lingua attivo.</span>
      )}
      <button type="button" className="btn" onClick={() => void apri(l.url, 'Cardmarket')}>Riapri la pagina e aggiorna</button>
    </section>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useArchivio } from '../archivio'
import {
  andamento, cambiDal, chiave, dollari, euro, NOMI_SOTTOTIPO, numeroBase, percento, sottotipoTcgplayer, storico,
  valoreCardmarket, valorePrincipale, VARIANTI_MISTE, type RigaPrezzo, type ValoriCardmarket, type ValoriTcgplayer,
} from '../prezzi'
import { supabase } from '../supabase'
import type { Lingua } from '../tipi'

// --- Freccia dell'andamento ---------------------------------------------------------

export function Freccia({ a, testo }: { a: number | null; testo?: boolean }) {
  if (a == null) return null
  const su = a >= 0.05
  const giu = a <= -0.05
  const colore = su ? 'var(--verde)' : giu ? 'var(--rosso)' : 'var(--tenue)'
  const segno = su ? '↑' : giu ? '↓' : '→'
  return (
    <span style={{ color: colore, fontWeight: 600 }} aria-label={`andamento ${percento(a)}`}>
      {segno}{testo ? ` ${percento(a)}` : ''}
    </span>
  )
}

// --- Prezzo piccolo sotto le miniature -----------------------------------------------

export function PrezzoBreve({ cm, tp, variante }: { cm: number | null; tp: number | null; variante: string | null }) {
  const { prezzi } = useArchivio()
  const v = valorePrincipale(prezzi, cm, tp, variante)
  if (!v) return null
  return (
    <span className="piccolo riga" style={{ gap: 6, flexWrap: 'nowrap' }}>
      <span className="mono" style={{ color: 'var(--testo)', whiteSpace: 'nowrap' }}>{euro(v.euro)}</span>
      <Freccia a={v.andamento} />
      {v.fonte === 'tcgplayer' && <span className="tenue" style={{ fontSize: 11 }}>TCGplayer</span>}
    </span>
  )
}

// --- Grafico dello storico ----------------------------------------------------------

const PERIODI = [['1M', 31], ['3M', 92], ['1A', 366], ['Tutto', 0]] as const

interface Punto { data: string; v: number }

function Grafico({ serie }: { serie: { nome: string; colore: string; punti: Punto[] }[] }) {
  const tutti = serie.flatMap((s) => s.punti)
  const date = Array.from(new Set(tutti.map((p) => p.data))).sort()
  if (date.length < 2) return null
  const min = Math.min(...tutti.map((p) => p.v))
  const max = Math.max(...tutti.map((p) => p.v))
  const W = 320, H = 150, sx = 8, dx = 8, alto = 16, basso = 22
  const x = (d: string) => sx + ((W - sx - dx) * date.indexOf(d)) / (date.length - 1)
  const y = (v: number) => alto + (H - alto - basso) * (max === min ? 0.5 : 1 - (v - min) / (max - min))
  const breve = (d: string) => new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  return (
    <div className="colonna" style={{ gap: 6 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Andamento del prezzo">
        {[0, 0.5, 1].map((f) => <line key={f} x1={sx} x2={W - dx} y1={alto + (H - alto - basso) * f} y2={alto + (H - alto - basso) * f} stroke="var(--bordo)" strokeWidth="1" />)}
        {serie.map((s) => s.punti.length > 0 && (
          <polyline key={s.nome} fill="none" stroke={s.colore} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
            points={s.punti.map((p) => `${x(p.data).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')} />
        ))}
        <text x={sx} y={H - 6} fill="var(--tenue)" fontSize="11">{breve(date[0])}</text>
        <text x={W - dx} y={H - 6} fill="var(--tenue)" fontSize="11" textAnchor="end">{breve(date[date.length - 1])}</text>
        <text x={sx} y={alto - 2} fill="var(--tenue)" fontSize="11">{euro(max)}</text>
        {max !== min && <text x={sx} y={H - basso - 4} fill="var(--tenue)" fontSize="11">{euro(min)}</text>}
      </svg>
      <div className="riga" style={{ gap: 14 }}>
        {serie.filter((s) => s.punti.length > 0).map((s) => (
          <span key={s.nome} className="piccolo riga" style={{ gap: 6 }}><span style={{ width: 14, height: 3, background: s.colore, borderRadius: 2 }} />{s.nome}</span>
        ))}
      </div>
    </div>
  )
}

function Storico({ cm, tp, variante }: { cm: number | null; tp: number | null; variante: string | null }) {
  const [periodo, setPeriodo] = useState<number>(92)
  const [dati, setDati] = useState<{ cm: RigaPrezzo[]; tp: RigaPrezzo[]; usd: Map<string, number> } | null>(null)
  const dal = periodo ? new Date(Date.now() - periodo * 86400000).toISOString().slice(0, 10) : null

  useEffect(() => {
    let vivo = true
    setDati(null)
    void Promise.all([
      cm ? storico('cardmarket', cm, dal) : Promise.resolve([]),
      tp ? storico('tcgplayer', tp, dal) : Promise.resolve([]),
      tp ? cambiDal(dal) : Promise.resolve(new Map<string, number>()),
    ]).then(([a, b, c]) => { if (vivo) setDati({ cm: a, tp: b, usd: c }) }).catch(() => { if (vivo) setDati({ cm: [], tp: [], usd: new Map() }) })
    return () => { vivo = false }
  }, [cm, tp, dal])

  const serie = useMemo(() => {
    if (!dati) return []
    const usdVicino = (d: string) => {
      let u: number | undefined
      for (const [k, v] of dati.usd) if (k <= d) u = v
      return u ?? Array.from(dati.usd.values())[0]
    }
    const pcm = dati.cm.map((r) => {
      const v = valoreCardmarket(r.valori as ValoriCardmarket, variante)
      return { data: r.data, v: v?.trend ?? v?.avg30 ?? NaN }
    }).filter((p) => Number.isFinite(p.v))
    const ptp = dati.tp.map((r) => {
      const s = sottotipoTcgplayer(r.valori as ValoriTcgplayer, variante)
      const u = usdVicino(r.data)
      return { data: r.data, v: s?.[1].market != null && u ? s[1].market / u : NaN }
    }).filter((p) => Number.isFinite(p.v))
    return [
      { nome: 'Cardmarket, tendenza', colore: 'var(--accento)', punti: pcm },
      { nome: 'TCGplayer, mercato in €', colore: 'var(--arancio)', punti: ptp },
    ]
  }, [dati, variante])

  const giorni = Array.from(new Set(serie.flatMap((s) => s.punti.map((p) => p.data)))).sort()
  return (
    <div className="colonna" style={{ gap: 10 }}>
      <div className="chips" role="group" aria-label="Periodo del grafico">
        {PERIODI.map(([nome, g]) => (
          <button key={nome} type="button" className={`chip ${periodo === g ? 'attivo' : ''}`} aria-pressed={periodo === g} onClick={() => setPeriodo(g)}>{nome}</button>
        ))}
      </div>
      {!dati ? <span className="tenue piccolo">Caricamento dello storico…</span>
        : giorni.length >= 2 ? <Grafico serie={serie} />
        : <span className="tenue piccolo" style={{ lineHeight: 1.5 }}>
            {giorni.length === 1
              ? `Lo storico è iniziato il ${new Date(giorni[0]).toLocaleDateString('it-IT')}: il grafico si riempie un giorno alla volta.`
              : 'Nessun prezzo salvato in questo periodo.'}
          </span>}
    </div>
  )
}

// --- Scelta del prodotto TCGplayer -------------------------------------------------

interface ProdottoTcg { id: number; nome: string; numero: string | null; rarita: string | null; tcgplayer_gruppi: { nome: string; categoria: number; sigla: string | null } }

function SceltaTcgplayer({ lingua, nome, numero, setId, attuale, onScegli, onChiudi }: {
  lingua: Lingua; nome: string; numero: string; setId: string; attuale: number | null
  onScegli: (id: number | null) => void; onChiudi: () => void
}) {
  const giapponese = lingua === 'ja'
  const [testo, setTesto] = useState(giapponese ? '' : nome)
  const [soloNumero, setSoloNumero] = useState(true)
  const [soloSet, setSoloSet] = useState(giapponese)
  const [risultati, setRisultati] = useState<ProdottoTcg[] | null>(null)

  useEffect(() => {
    let vivo = true
    const t = setTimeout(() => {
      let q = supabase.from('tcgplayer_prodotti')
        .select('id, nome, numero, rarita, tcgplayer_gruppi!inner(nome, categoria, sigla)')
        .eq('tcgplayer_gruppi.categoria', giapponese ? 85 : 3)
        .limit(40)
      if (soloNumero) q = q.eq('numero_base', numeroBase(numero))
      if (soloSet) q = q.ilike('tcgplayer_gruppi.sigla', setId)
      if (testo.trim()) q = q.ilike('nome', `%${testo.trim()}%`)
      void q.then((r) => { if (vivo) setRisultati((r.data ?? []) as unknown as ProdottoTcg[]) })
    }, 300)
    return () => { vivo = false; clearTimeout(t) }
  }, [testo, soloNumero, soloSet, giapponese, numero, setId])

  return (
    <div className="foglio-sfondo" onClick={onChiudi}>
      <div className="foglio" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Scegli il prodotto TCGplayer">
        <div className="riga tra"><h2>Prodotto TCGplayer</h2><button type="button" className="btn" onClick={onChiudi}>Chiudi</button></div>
        <span className="tenue piccolo" style={{ lineHeight: 1.5 }}>
          Scegli la carta giusta tra quelle di TCGplayer. {giapponese ? 'I nomi delle carte giapponesi su TCGplayer sono in inglese.' : 'Per la Shadowless scegli quella del set "Base Set (Shadowless)".'}
        </span>
        <input className="campo-libero" type="search" value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Nome in inglese" aria-label="Cerca per nome" />
        <div className="riga a-capo" style={{ gap: 4 }}>
          <label className="spunta"><input type="checkbox" checked={soloNumero} onChange={(e) => setSoloNumero(e.target.checked)} />Solo numero {numero}</label>
          {giapponese && <label className="spunta"><input type="checkbox" checked={soloSet} onChange={(e) => setSoloSet(e.target.checked)} />Solo set {setId}</label>}
        </div>
        {risultati === null && <span className="tenue piccolo">Ricerca…</span>}
        {risultati?.length === 0 && <div className="vuoto">Nessun prodotto trovato. Prova a togliere un filtro.</div>}
        {risultati?.map((p) => (
          <button key={p.id} type="button" className="voce" style={{ textAlign: 'left', cursor: 'pointer', borderColor: p.id === attuale ? 'var(--accento)' : undefined }} onClick={() => onScegli(p.id)}>
            <span className="colonna" style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <span className="taglia" style={{ fontWeight: 600 }}>{p.nome}</span>
              <span className="tenue piccolo taglia">{p.tcgplayer_gruppi.nome} · {p.numero}{p.rarita ? ` · ${p.rarita}` : ''}</span>
            </span>
            {p.id === attuale ? <span className="etichetta blu">Attuale</span> : <span style={{ color: 'var(--accento)', fontWeight: 600 }}>Scegli</span>}
          </button>
        ))}
        {attuale && <button type="button" className="btn" onClick={() => onScegli(null)}>Scollega da TCGplayer</button>}
      </div>
    </div>
  )
}

function useNomeProdotto(tp: number | null) {
  const [p, setP] = useState<ProdottoTcg | null>(null)
  useEffect(() => {
    setP(null)
    if (!tp) return
    let vivo = true
    void supabase.from('tcgplayer_prodotti').select('id, nome, numero, rarita, tcgplayer_gruppi(nome, categoria, sigla)').eq('id', tp).maybeSingle()
      .then((r) => { if (vivo) setP(r.data as unknown as ProdottoTcg | null) })
    return () => { vivo = false }
  }, [tp])
  return p
}

// --- Sezione "Valore della carta" ------------------------------------------------

export function ValoreCarta({ cm, tp, variante, lingua, nome, numero, setId, costo, prezzoMax, onTcgplayer }: {
  cm: number | null
  tp: number | null
  variante: string | null
  lingua: Lingua
  nome: string
  numero: string
  setId: string
  costo?: number | null // costo effettivo della tua copia
  prezzoMax?: number | null // prezzo massimo della wantlist
  onTcgplayer: (id: number | null) => Promise<void>
}) {
  const { prezzi } = useArchivio()
  const [scegli, setScegli] = useState(false)
  const prodotto = useNomeProdotto(tp)
  const principale = valorePrincipale(prezzi, cm, tp, variante)
  const vcm = cm ? valoreCardmarket(prezzi.ultimi.get(chiave('cardmarket', cm))?.valori as ValoriCardmarket, variante) : null
  const rtp = tp ? prezzi.ultimi.get(chiave('tcgplayer', tp)) : undefined
  const stp = sottotipoTcgplayer(rtp?.valori as ValoriTcgplayer, variante)
  const inEuro = (d: number | undefined) => (d != null && prezzi.usd ? ` (${euro(d / prezzi.usd)})` : '')
  const misto = variante != null && VARIANTI_MISTE.includes(variante)
  const a = andamento(vcm)

  return (
    <section className="scheda">
      <h2>Valore della carta</h2>
      {principale ? (
        <div className="colonna" style={{ gap: 4 }}>
          <span className="riga" style={{ gap: 10, alignItems: 'baseline' }}>
            <span className="mono" style={{ fontSize: 28, fontWeight: 600 }}>{euro(principale.euro)}</span>
            <Freccia a={principale.andamento} testo />
          </span>
          <span className="tenue piccolo">
            {principale.fonte === 'cardmarket' ? 'Tendenza Cardmarket' : 'Prezzo di mercato TCGplayer, convertito in euro'}
            {principale.andamento != null && ', freccia: media degli ultimi 7 giorni rispetto agli ultimi 30'}
          </span>
        </div>
      ) : (
        <div className="avviso">Ancora nessun prezzo per questa carta: arriva con il prossimo aggiornamento notturno, se la carta è collegata a Cardmarket o TCGplayer.</div>
      )}

      {principale && costo != null && (() => {
        const diff = principale.euro - costo
        return (
          <div className="avviso" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>Ti è costata <span className="mono">{euro(costo)}</span>, vale ora <span className="mono">{euro(principale.euro)}</span></span>
            <span className="mono" style={{ color: diff >= 0 ? 'var(--verde)' : 'var(--rosso)', fontWeight: 600 }}>
              {diff >= 0 ? '+' : '−'}{euro(Math.abs(diff))}{costo > 0 ? ` (${percento(diff / costo)})` : ''}
            </span>
          </div>
        )
      })()}

      {principale && prezzoMax != null && (
        principale.euro <= prezzoMax
          ? <div className="avviso" style={{ background: 'var(--verde-f)', color: 'var(--verde)' }}>Sotto il tuo prezzo massimo di {euro(prezzoMax)}</div>
          : <div className="avviso">Sopra il tuo prezzo massimo di {euro(prezzoMax)} (di {euro(principale.euro - prezzoMax)})</div>
      )}

      <div className="colonna" style={{ gap: 8, paddingTop: 10, borderTop: '1px solid var(--bordo)' }}>
        <span style={{ fontWeight: 600 }}>Cardmarket{vcm?.holo ? ', versione reverse/foil' : ''}</span>
        {vcm ? (
          <div className="dati">
            <div><div className="lbl">Tendenza</div><span className="mono">{euro(vcm.trend)}</span></div>
            <div><div className="lbl">Media 1 giorno</div><span className="mono">{euro(vcm.avg1)}</span></div>
            <div><div className="lbl">Media 7 giorni</div><span className="mono">{euro(vcm.avg7)}</span></div>
            <div><div className="lbl">Media 30 giorni</div><span className="mono">{euro(vcm.avg30)}</span></div>
            <div><div className="lbl">Prezzo più basso</div><span className="mono">{euro(vcm.low)}</span></div>
            {a != null && <div><div className="lbl">7 giorni su 30</div><Freccia a={a} testo /></div>}
          </div>
        ) : <span className="tenue piccolo">{cm ? 'Nessun prezzo ancora salvato.' : 'Carta non ancora collegata a Cardmarket: si collega da sola con l\'aggiornamento notturno.'}</span>}
        {vcm && misto && <span className="piccolo" style={{ color: 'var(--arancio)' }}>Prezzo misto: Cardmarket non separa {variante === 'Shadowless' ? 'la Shadowless' : 'prima edizione e Unlimited'}. Il valore principale viene da TCGplayer, se collegato.</span>}
        {vcm && lingua !== 'ja' && <span className="tenue piccolo">Cardmarket ha un solo prezzo per inglese e italiano.</span>}
      </div>

      <div className="colonna" style={{ gap: 8, paddingTop: 10, borderTop: '1px solid var(--bordo)' }}>
        <span style={{ fontWeight: 600 }}>TCGplayer{stp ? `, ${NOMI_SOTTOTIPO[stp[0]] ?? stp[0]}` : ''}</span>
        {stp ? (
          <div className="dati">
            <div><div className="lbl">Mercato</div><span className="mono">{dollari(stp[1].market)}</span><div className="tenue piccolo mono">{inEuro(stp[1].market).trim()}</div></div>
            <div><div className="lbl">Prezzo più basso</div><span className="mono">{dollari(stp[1].low)}</span></div>
            <div><div className="lbl">Medio</div><span className="mono">{dollari(stp[1].mid)}</span></div>
          </div>
        ) : <span className="tenue piccolo">{tp ? 'Nessun prezzo ancora salvato.' : 'Carta non collegata a TCGplayer.'}</span>}
        {rtp && Object.keys(rtp.valori).length > 1 && (
          <span className="tenue piccolo">Altre versioni: {Object.entries(rtp.valori as ValoriTcgplayer).filter(([k]) => k !== stp?.[0]).map(([k, v]) => `${NOMI_SOTTOTIPO[k] ?? k} ${dollari(v.market ?? v.low)}`).join(' · ')}</span>
        )}
        <div className="riga tra" style={{ gap: 8 }}>
          <span className="tenue piccolo taglia">{tp ? (prodotto ? `${prodotto.tcgplayer_gruppi?.nome ?? ''} · ${prodotto.nome}` : `Prodotto ${tp}`) : ''}</span>
          <button type="button" className="btn" style={{ flex: 'none' }} onClick={() => setScegli(true)}>{tp ? 'Cambia' : 'Scegli il prodotto'}</button>
        </div>
      </div>

      {(cm || tp) && (
        <div className="colonna" style={{ gap: 8, paddingTop: 10, borderTop: '1px solid var(--bordo)' }}>
          <span style={{ fontWeight: 600 }}>Andamento</span>
          <Storico cm={cm} tp={tp} variante={variante} />
        </div>
      )}

      <span className="tenue piccolo">
        {prezzi.aggiornato ? `Prezzi aggiornati il ${new Date(prezzi.aggiornato).toLocaleString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.` : 'I prezzi si aggiornano ogni notte.'}
        {prezzi.usd ? ` Cambio BCE: 1 € = ${prezzi.usd.toLocaleString('it-IT')} $.` : ''}
      </span>

      {scegli && (
        <SceltaTcgplayer lingua={lingua} nome={nome} numero={numero} setId={setId} attuale={tp} onChiudi={() => setScegli(false)}
          onScegli={(id) => { setScegli(false); void onTcgplayer(id) }} />
      )}
    </section>
  )
}

import { oggiLocale, type CategoriaVoce, type Ordine, type VoceImportazione } from './tipi'

// Voci di partenza, dalle regole in vigore a fine ottobre 2026. Si modificano da Impostazioni.
export const VOCI_PREDEFINITE: Partial<VoceImportazione>[] = [
  {
    nome: 'IVA all\'importazione', categoria: 'iva', calcolo: 'percentuale', valore: 22, base_iva: false,
    note: 'Calcolata su merce + spedizione + dazio e le voci che entrano nella base IVA.',
  },
  {
    nome: 'Dazio carte da gioco (9504 40 00)', categoria: 'dazio', calcolo: 'percentuale', valore: 0, base_iva: true, valore_min: 150,
    note: 'Tariffa UE per le carte da gioco sopra i 150 € di merce: 0%.',
  },
  {
    nome: 'Dazio fisso UE fino a 150 €', categoria: 'dazio', calcolo: 'fisso', valore: 3, base_iva: true, valore_max: 150,
    dal: '2026-07-01', al: '2028-07-01',
    note: 'Reg. UE 2026/382. 3 € per tipo di prodotto: un pacco di sole carte conta come uno. All\'inizio vale per i venditori registrati IOSS: con un proxy può non applicarsi.',
  },
  {
    nome: 'Contributo UE di gestione', categoria: 'diritti', calcolo: 'fisso', valore: 2, base_iva: true,
    dal: '2026-11-01',
    note: 'Contributo UE per articolo dichiarato, per le vendite a distanza, a qualsiasi valore. Un pacco di sole carte conta come uno. È soggetto a IVA.',
  },
  {
    nome: 'Contributo italiano spedizioni extra-UE', categoria: 'diritti', calcolo: 'fisso', valore: 2, base_iva: false, valore_max: 150,
    dal: '2026-12-01',
    note: 'Legge 199/2025, 2 € a spedizione. Rinviato più volte; non è ancora chiaro se si somma al contributo UE. Fuori dalla base IVA.',
  },
]

export interface RigaStima { voce: VoceImportazione; importo: number }

export interface Stima {
  dazio: number
  diritti: number
  iva: number
  righe: RigaStima[]
  data: string // data con cui sono state scelte le regole
}

const tondo = (n: number) => Math.round(n * 100) / 100

// La data che conta per la dogana: l'arrivo, o oggi se il pacco non è ancora arrivato.
export function dataImportazione(o: Pick<Ordine, 'data' | 'data_arrivo'>): string {
  if (o.data_arrivo) return o.data_arrivo
  const oggi = oggiLocale()
  return oggi > o.data ? oggi : o.data
}

export function statoVoce(v: VoceImportazione, data = oggiLocale()): 'attiva' | 'futura' | 'scaduta' | 'spenta' {
  if (!v.attiva) return 'spenta'
  if (v.dal && data < v.dal) return 'futura'
  if (v.al && data >= v.al) return 'scaduta'
  return 'attiva'
}

function siApplica(v: VoceImportazione, data: string, merce: number, corriere: string | null): boolean {
  if (statoVoce(v, data) !== 'attiva') return false
  if (v.valore_min != null && !(merce > Number(v.valore_min))) return false
  if (v.valore_max != null && merce > Number(v.valore_max)) return false
  if (v.corriere && !(corriere || '').toLowerCase().includes(v.corriere.toLowerCase())) return false
  return true
}

type DatiStima = Pick<Ordine, 'tipo' | 'data' | 'data_arrivo' | 'spedizione' | 'corriere' | 'iva_al_sito' | 'dazio'>

// Stima di dazio, diritti e IVA per un ordine dal Giappone. Gli ordini europei non pagano nulla.
export function stimaImportazione(o: DatiStima, merce: number, voci: VoceImportazione[]): Stima {
  const data = dataImportazione(o)
  const vuota: Stima = { dazio: 0, diritti: 0, iva: 0, righe: [], data }
  if (o.tipo !== 'giappone') return vuota
  const valide = voci.filter((v) => siApplica(v, data, merce, o.corriere))
  const righe: RigaStima[] = []
  const tot: Record<CategoriaVoce, number> = { dazio: 0, diritti: 0, iva: 0 }
  let baseIva = merce + Number(o.spedizione || 0)

  for (const cat of ['dazio', 'diritti'] as const) {
    for (const v of valide.filter((x) => x.categoria === cat)) {
      const importo = tondo(v.calcolo === 'fisso' ? Number(v.valore) : ((merce + Number(o.spedizione || 0)) * Number(v.valore)) / 100)
      righe.push({ voce: v, importo })
      tot[cat] += importo
      // se il dazio è già confermato, nella base IVA va quello vero (aggiunto sotto)
      if (v.base_iva && !(cat === 'dazio' && o.dazio != null)) baseIva += importo
    }
  }
  if (o.dazio != null) baseIva += Number(o.dazio)

  if (!o.iva_al_sito) {
    for (const v of valide.filter((x) => x.categoria === 'iva')) {
      const importo = tondo(v.calcolo === 'fisso' ? Number(v.valore) : (baseIva * Number(v.valore)) / 100)
      righe.push({ voce: v, importo })
      tot.iva += importo
    }
  }
  return { dazio: tondo(tot.dazio), diritti: tondo(tot.diritti), iva: tondo(tot.iva), righe, data }
}

export interface CostiEffettivi {
  spedizione: number
  commissioni: number
  dazio: number
  diritti: number
  iva: number
  altre_spese: number
  stimati: CategoriaVoce[] // le voci che vengono dalla stima e non da importi confermati
  stima: Stima
  totale: number
}

type DatiCosti = DatiStima & Pick<Ordine, 'commissioni' | 'iva' | 'diritti' | 'altre_spese'>

export function costiEffettivi(o: DatiCosti, merce: number, voci: VoceImportazione[]): CostiEffettivi {
  const stima = stimaImportazione(o, merce, voci)
  const stimati: CategoriaVoce[] = []
  const prendi = (k: CategoriaVoce) => {
    const v = o[k]
    if (v != null) return Number(v)
    if (stima[k] > 0) stimati.push(k)
    return stima[k]
  }
  const dazio = prendi('dazio')
  const diritti = prendi('diritti')
  const iva = prendi('iva')
  const c = {
    spedizione: Number(o.spedizione || 0), commissioni: Number(o.commissioni || 0),
    dazio, diritti, iva, altre_spese: Number(o.altre_spese || 0),
  }
  return { ...c, stimati, stima, totale: tondo(Object.values(c).reduce((a, b) => a + b, 0)) }
}

export function descriviVoce(v: VoceImportazione): string {
  const val = Number(v.valore).toLocaleString('it-IT', { maximumFractionDigits: 2 })
  const quanto = v.calcolo === 'percentuale'
    ? `${val}% ${v.categoria === 'iva' ? 'su merce + spedizione + dazio' : 'su merce + spedizione'}`
    : `${Number(v.valore).toFixed(2).replace('.', ',')} € a spedizione`
  return quanto
}

const dataBreve = (d: string) => new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })

export function condizioniVoce(v: VoceImportazione): string {
  const p: string[] = []
  if (v.valore_min != null) p.push(`merce oltre ${Number(v.valore_min)} €`)
  if (v.valore_max != null) p.push(`merce fino a ${Number(v.valore_max)} €`)
  if (v.dal && v.al) p.push(`dal ${dataBreve(v.dal)} al ${dataBreve(v.al)}`)
  else if (v.dal) p.push(`dal ${dataBreve(v.dal)}`)
  else if (v.al) p.push(`fino al ${dataBreve(v.al)}`)
  if (v.corriere) p.push(`solo ${v.corriere}`)
  return p.join(' · ')
}

export type Lingua = 'en' | 'it' | 'ja'
export type Stato = 'collezione' | 'viaggio' | 'venduta'
export type TipoCollezione = 'manuale' | 'automatica' | 'set'

export const LINGUE: { id: Lingua; nome: string; breve: string }[] = [
  { id: 'en', nome: 'Inglese', breve: 'EN' },
  { id: 'it', nome: 'Italiano', breve: 'IT' },
  { id: 'ja', nome: 'Giapponese', breve: 'JP' },
]

export const CONDIZIONI = [
  { id: 'MT', nome: 'Mint' },
  { id: 'NM', nome: 'Near Mint' },
  { id: 'EX', nome: 'Excellent' },
  { id: 'GD', nome: 'Good' },
  { id: 'LP', nome: 'Light Played' },
  { id: 'PL', nome: 'Played' },
  { id: 'PO', nome: 'Poor' },
]

export const STATI: { id: Stato; nome: string }[] = [
  { id: 'collezione', nome: 'In collezione' },
  { id: 'viaggio', nome: 'In viaggio' },
  { id: 'venduta', nome: 'Venduta' },
]

export interface Copia {
  id: string
  carta_id: string
  lingua: Lingua
  nome: string
  set_id: string
  set_nome: string | null
  numero: string
  rarita: string | null
  illustratore: string | null
  immagine: string | null
  cardmarket_id: number | null
  stato: Stato
  condizione: string
  gradata: boolean
  ente: string | null
  voto: string | null
  certificato: string | null
  protezione: string | null
  posizione_id: string | null
  pagina: string | null
  prezzo_pagato: number | null
  valuta: string
  data_arrivo: string | null
  foto_url: string | null
  note: string | null
  variante: string | null
  ordine_id: string | null
  quota_spese: number | null
  created_at: string
}

export const VARIANTI = [
  'Normale', 'Unlimited', 'Prima edizione', 'Shadowless', 'Holo', 'Reverse holo',
  'Timbro promo', 'Timbro staff', 'Timbro prerelease',
]

export interface Desiderio {
  id: string
  carta_id: string
  lingua: Lingua
  nome: string
  set_id: string
  set_nome: string | null
  numero: string
  immagine: string | null
  cardmarket_id: number | null
  variante: string | null
  condizione_min: string | null
  gradata: '' | 'si' | 'no'
  prezzo_max: number | null
  ordine_id: string | null
  note: string | null
  created_at: string
}

export type TipoOrdine = 'europa' | 'giappone'

export const TAPPE: Record<TipoOrdine, string[]> = {
  europa: ['Pagato', 'Spedito', 'In consegna', 'Consegnato', 'Ricevuto'],
  giappone: ['Acquistata', 'Al magazzino del proxy', 'Spedizione internazionale', 'Dogana', 'Ricevuta'],
}

export interface Ordine {
  id: string
  tipo: TipoOrdine
  sito: string
  venditore: string | null
  data: string
  tracciamento: string | null
  tappa: number
  spedizione: number
  commissioni: number
  iva: number
  dazio: number
  altre_spese: number
  arrivato: boolean
  data_arrivo: string | null
  note: string | null
  created_at: string
}

export interface Regole {
  lingua?: Lingua | ''
  gradata?: 'si' | 'no' | ''
  pokemon?: string
  rarita?: string
  prefisso?: string
}

export interface Collezione {
  id: string
  nome: string
  tipo: TipoCollezione
  regole: Regole
  set_id: string | null
  set_nome: string | null
  lingua: Lingua | null
  created_at: string
}

export interface Posizione {
  id: string
  nome: string
}

export interface Legame {
  collezione_id: string
  copia_id: string
}

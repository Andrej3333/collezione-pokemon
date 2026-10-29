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

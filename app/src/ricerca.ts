import { caricaCatalogo } from './catalogo'
import type { Lingua } from './tipi'

// Collegamenti di ricerca sui siti. Il browser interno li apre nell'app.
export interface LinkSito { sito: string; url: string; nota?: string }

interface CartaPerRicerca { nome: string; numero: string; set_id: string; set_nome: string | null; lingua: Lingua }

// Sigla ufficiale del set (GEN, EVO, MEW…), come la usano Cardmarket ed eBay nei nomi delle carte.
// Le sigle stanno nel catalogo inglese; l'italiano usa lo stesso codice del set.
export async function siglaSet(setId: string, lingua: Lingua): Promise<string> {
  try {
    const propria = (await caricaCatalogo(lingua)).setPerId.get(setId)?.sigla
    if (propria) return propria
    return lingua === 'ja' ? '' : (await caricaCatalogo('en')).setPerId.get(setId)?.sigla ?? ''
  } catch {
    return ''
  }
}

export function linkRicerca(c: CartaPerRicerca, sigla = ''): LinkSito[] {
  const enc = encodeURIComponent
  if (c.lingua === 'ja') {
    return [
      { sito: 'Mercari', url: `https://jp.mercari.com/search?keyword=${enc(`${c.nome} ${c.numero}`)}`, nota: 'per comprare serve un proxy' },
      { sito: 'Cardmarket', url: `https://www.cardmarket.com/it/Pokemon/Products/Search?searchString=${enc(`${c.nome} ${c.set_id} ${c.numero}`)}` },
      { sito: 'eBay', url: `https://www.ebay.it/sch/i.html?_nkw=${enc(`${c.set_id} ${c.numero} japanese pokemon`)}` },
    ]
  }
  // Cardmarket chiama le carte "Pikachu (GEN RC29)": nome, sigla del set e numero
  const cardmarket = sigla ? `${c.nome} (${sigla} ${c.numero})` : `${c.nome} ${c.numero}`
  const ebay = `${c.nome} ${c.numero} ${c.set_nome ?? ''} ${c.lingua === 'it' ? 'ita' : ''}`.replace(/\s+/g, ' ').trim()
  return [
    { sito: 'Cardmarket', url: `https://www.cardmarket.com/it/Pokemon/Products/Search?searchString=${enc(cardmarket)}` },
    { sito: 'eBay', url: `https://www.ebay.it/sch/i.html?_nkw=${enc(ebay)}` },
    { sito: 'Mercari', url: `https://jp.mercari.com/search?keyword=${enc(`${c.nome} ${c.numero}`)}`, nota: 'per comprare serve un proxy' },
  ]
}

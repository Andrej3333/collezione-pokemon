import type { Lingua } from './tipi'

// Collegamenti provvisori alle ricerche sui siti (finche non c'e il browser interno).
export interface LinkSito { sito: string; url: string; nota?: string }

export function linkRicerca(c: { nome: string; numero: string; set_id: string; set_nome: string | null; lingua: Lingua }): LinkSito[] {
  const enc = encodeURIComponent
  if (c.lingua === 'ja') {
    return [
      { sito: 'Mercari', url: `https://jp.mercari.com/search?keyword=${enc(`${c.nome} ${c.numero}`)}`, nota: 'per comprare serve un proxy' },
      { sito: 'eBay', url: `https://www.ebay.it/sch/i.html?_nkw=${enc(`${c.set_id} ${c.numero} japanese pokemon`)}` },
    ]
  }
  const base = `${c.nome} ${c.numero}`
  return [
    { sito: 'Cardmarket', url: `https://www.cardmarket.com/it/Pokemon/Products/Search?searchString=${enc(c.nome)}` },
    { sito: 'eBay', url: `https://www.ebay.it/sch/i.html?_nkw=${enc(`${base} ${c.set_nome ?? ''} ${c.lingua === 'it' ? 'ita' : ''}`.trim())}` },
    { sito: 'Mercari', url: `https://jp.mercari.com/search?keyword=${enc(base)}`, nota: 'per comprare serve un proxy' },
  ]
}

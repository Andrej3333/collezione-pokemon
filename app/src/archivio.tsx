import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { elencoCollezioni, elencoCopie, elencoLegami, elencoOrdini, elencoPosizioni, elencoVoci, elencoWantlist } from './dati'
import { caricaPrezzi, PREZZI_VUOTI, type Prezzi } from './prezzi'
import type { Collezione, Copia, Desiderio, Legame, Ordine, Posizione, VoceImportazione } from './tipi'

interface Archivio {
  copie: Copia[]
  collezioni: Collezione[]
  legami: Legame[]
  posizioni: Posizione[]
  wantlist: Desiderio[]
  ordini: Ordine[]
  voci: VoceImportazione[]
  prezzi: Prezzi
  caricato: boolean
  errore: string | null
  ricarica: () => Promise<void>
}

const Ctx = createContext<Archivio | null>(null)

export function ArchivioProvider({ children }: { children: ReactNode }) {
  const [stato, setStato] = useState<Omit<Archivio, 'ricarica'>>({
    copie: [], collezioni: [], legami: [], posizioni: [], wantlist: [], ordini: [], voci: [], prezzi: PREZZI_VUOTI, caricato: false, errore: null,
  })

  const ricarica = useCallback(async () => {
    try {
      const [copie, collezioni, legami, posizioni, wantlist, ordini, voci] = await Promise.all([
        elencoCopie(), elencoCollezioni(), elencoLegami(), elencoPosizioni(), elencoWantlist(), elencoOrdini(),
        elencoVoci().catch(() => [] as VoceImportazione[]), // senza regole l'app funziona lo stesso, senza stime
      ])
      const seguite = [...copie.filter((c) => c.stato !== 'venduta'), ...wantlist]
      const prezzi = await caricaPrezzi(
        seguite.map((c) => c.cardmarket_id).filter((x): x is number => x != null),
        seguite.map((c) => c.tcgplayer_id).filter((x): x is number => x != null),
      ).catch(() => PREZZI_VUOTI) // senza prezzi l'app funziona lo stesso
      setStato({ copie, collezioni, legami, posizioni, wantlist, ordini, voci, prezzi, caricato: true, errore: null })
    } catch (e) {
      setStato((s) => ({ ...s, caricato: true, errore: (e as Error).message }))
    }
  }, [])

  useEffect(() => { void ricarica() }, [ricarica])

  return <Ctx.Provider value={{ ...stato, ricarica }}>{children}</Ctx.Provider>
}

export function useArchivio(): Archivio {
  const a = useContext(Ctx)
  if (!a) throw new Error('ArchivioProvider mancante')
  return a
}

// Le copie che appartengono a una collezione, secondo il suo tipo.
export function copieDi(col: Collezione, copie: Copia[], legami: Legame[]): Copia[] {
  if (col.tipo === 'manuale') {
    const ids = new Set(legami.filter((l) => l.collezione_id === col.id).map((l) => l.copia_id))
    return copie.filter((c) => ids.has(c.id))
  }
  if (col.tipo === 'set') {
    const pre = (col.regole?.prefisso || '').toUpperCase()
    return copie.filter((c) => c.set_id === col.set_id && c.lingua === col.lingua && (!pre || c.numero.toUpperCase().startsWith(pre)))
  }
  const r = col.regole || {}
  const pk = (r.pokemon || '').trim().toLowerCase()
  const ra = (r.rarita || '').trim().toLowerCase()
  return copie.filter((c) =>
    (!r.lingua || c.lingua === r.lingua) &&
    (!r.gradata || (r.gradata === 'si' ? c.gradata : !c.gradata)) &&
    (!pk || c.nome.toLowerCase().includes(pk)) &&
    (!ra || (c.rarita || '').toLowerCase().includes(ra)))
}

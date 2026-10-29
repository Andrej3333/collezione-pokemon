import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useArchivio } from '../archivio'
import { dettaglio, type Catalogo, type CartaCatalogo, type Dettaglio } from '../catalogo'
import { Indietro } from '../comuni'
import { collega, nuovaCopia } from '../dati'
import type { Lingua } from '../tipi'
import { CartaScelta, CercaCarta } from './CercaCarta'
import { FormCopia, VALORI_INIZIALI } from './FormCopia'

export function AggiungiCarta() {
  const { ricarica } = useArchivio()
  const navigate = useNavigate()
  const [scelta, setScelta] = useState<{ c: CartaCatalogo; lingua: Lingua; cat: Catalogo } | null>(null)
  const [det, setDet] = useState<Dettaglio | null>(null)

  useEffect(() => {
    setDet(null)
    if (scelta) void dettaglio(scelta.lingua, scelta.c.id).then(setDet)
  }, [scelta])

  if (scelta) {
    const { c, lingua, cat } = scelta
    const set = cat.setPerId.get(c.setId)
    return (
      <main className="pagina" style={{ maxWidth: 720 }}>
        <button type="button" className="indietro btn" style={{ border: 0, background: 'transparent', padding: 0, color: 'var(--accento)' }} onClick={() => setScelta(null)}>‹ Torna alla ricerca</button>
        <CartaScelta c={c} lingua={lingua} cat={cat} />
        <FormCopia iniziali={{ ...VALORI_INIZIALI, variante: det?.varianti[0] ?? null }} key={det ? 'pronto' : 'attesa'}
          variantiSuggerite={det?.varianti ?? []} collezioniIniziali={[]} etichettaSalva="Aggiungi alla collezione"
          onSalva={async (v, collezioni) => {
            const d = det ?? await dettaglio(lingua, c.id)
            const copia = await nuovaCopia({
              ...v,
              carta_id: c.id, lingua, nome: c.nome, set_id: c.setId,
              set_nome: d.setNome ?? set?.nome ?? null, numero: c.numero,
              rarita: d.rarita, illustratore: d.illustratore, immagine: c.immagine || d.immagine,
              cardmarket_id: d.cardmarketId, tcgplayer_id: d.tcgplayerId,
            })
            for (const id of collezioni) await collega(id, copia.id)
            await ricarica()
            navigate(`/carta/${copia.id}`, { replace: true })
          }} />
      </main>
    )
  }

  return (
    <main className="pagina">
      <Indietro to="/carte">Tutte le carte</Indietro>
      <h1>Aggiungi carta</h1>
      <CercaCarta onScelta={(c, lingua, cat) => setScelta({ c, lingua, cat })} />
    </main>
  )
}

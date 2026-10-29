import { Link } from 'react-router-dom'
import { copieDi, useArchivio } from '../archivio'
import { Attesa, ImmagineCopia } from '../comuni'
import type { Collezione, Copia } from '../tipi'

function Mosaico({ copie }: { copie: Copia[] }) {
  const tre = copie.slice(0, 3)
  return (
    <span className="mosaico" aria-hidden="true">
      {tre.length === 0 && <span className="img-vuota" style={{ left: 15, top: 0, width: 50 }}> </span>}
      {tre.map((c, i) => (
        <span key={c.id} style={{ left: i * 15, top: (2 - i) * 3 }}><ImmagineCopia copia={c} /></span>
      ))}
    </span>
  )
}

const conta = (n: number) => `${n} ${n === 1 ? 'carta' : 'carte'}`

const TIPI: Record<Collezione['tipo'], [string, string]> = {
  manuale: ['Scelta da te', ''],
  automatica: ['Automatica', 'verde'],
  set: ['Set da completare', 'blu'],
}

export function Collezioni() {
  const { copie, collezioni, legami, posizioni, caricato, errore } = useArchivio()
  if (!caricato) return <main className="pagina"><Attesa /></main>
  const inViaggio = copie.filter((c) => c.stato === 'viaggio').length
  const possedute = copie.filter((c) => c.stato !== 'venduta')

  return (
    <main className="pagina">
      {errore && <div className="avviso errore">Errore nel caricare i dati: {errore}</div>}
      <div className="riga tra">
        <h1>Collezioni</h1>
        <Link className="btn primario" to="/nuova">Nuova</Link>
      </div>

      <Link className="voce" to="/carte">
        <Mosaico copie={possedute} />
        <span className="colonna" style={{ flex: 1, gap: 3 }}>
          <span style={{ fontWeight: 600, fontSize: 17 }}>Tutte le carte</span>
          <span className="tenue piccolo">{possedute.length} carte{inViaggio ? ` · ${inViaggio} in viaggio` : ''}</span>
        </span>
        <span className="tenue" aria-hidden="true">›</span>
      </Link>

      <h2>Le tue collezioni</h2>
      {collezioni.length === 0 ? (
        <div className="vuoto">Nessuna collezione per ora.<br />Tocca <b>Nuova</b> per crearne una: scelta da te, automatica o un set da completare.</div>
      ) : (
        <div className="colonna" style={{ gap: 8 }}>
          {collezioni.map((col) => {
            const membri = copieDi(col, possedute, legami)
            const [tipo, colore] = TIPI[col.tipo]
            return (
              <Link key={col.id} className="voce" to={`/collezione/${col.id}`}>
                <Mosaico copie={membri} />
                <span className="colonna" style={{ flex: 1, gap: 4 }}>
                  <span style={{ fontWeight: 600 }}>{col.nome}</span>
                  <span className="tenue piccolo">{membri.length} {membri.length === 1 ? 'carta' : 'carte'}</span>
                  <span className={`etichetta ${colore}`}>{tipo}</span>
                </span>
                <span className="tenue" aria-hidden="true">›</span>
              </Link>
            )
          })}
        </div>
      )}

      <h2>Dove sono</h2>
      <div className="colonna" style={{ gap: 8 }}>
        {posizioni.map((p) => (
          <Link key={p.id} className="voce" to={`/carte?posizione=${p.id}`} style={{ justifyContent: 'space-between' }}>
            <span>{p.nome}</span>
            <span className="tenue piccolo">{conta(possedute.filter((c) => c.posizione_id === p.id).length)}</span>
          </Link>
        ))}
        <Link className="voce" to="/carte?posizione=nessuna" style={{ justifyContent: 'space-between' }}>
          <span>Senza posizione</span>
          <span className="tenue piccolo">{conta(possedute.filter((c) => !c.posizione_id).length)}</span>
        </Link>
      </div>
    </main>
  )
}

import { Link } from 'react-router-dom'
import { useArchivio } from '../archivio'
import { Attesa, breveLingua, ImmagineCopia, Indietro } from '../comuni'
import { euro, percento, valorePrincipale } from '../prezzi'
import { PrezzoBreve } from './Valore'

export function Vendute() {
  const { copie, prezzi, caricato } = useArchivio()
  if (!caricato) return <main className="pagina"><Attesa /></main>
  const vendute = copie.filter((c) => c.stato === 'venduta')
    .sort((a, b) => (b.data_vendita ?? '').localeCompare(a.data_vendita ?? ''))
  return (
    <main className="pagina" style={{ maxWidth: 900 }}>
      <Indietro to="/">Collezioni</Indietro>
      <h1>Vendute</h1>
      <span className="tenue" style={{ lineHeight: 1.5 }}>Le carte che hai venduto: il prezzo continua a essere seguito, così vedi com'è andato dopo la vendita.</span>
      {vendute.length === 0 && <div className="vuoto">Nessuna carta venduta.<br />Per segnarne una, apri la carta e cambia lo stato in "venduta".</div>}
      <div className="colonna" style={{ gap: 8 }}>
        {vendute.map((c) => {
          const ora = valorePrincipale(prezzi, c.cardmarket_id, c.tcgplayer_id, c.variante)
          const diff = ora && c.prezzo_vendita != null ? ora.euro - Number(c.prezzo_vendita) : null
          return (
            <Link key={c.id} to={`/carta/${c.id}`} className="voce" style={{ gap: 12 }}>
              <span style={{ width: 52, flex: 'none' }}><ImmagineCopia copia={c} /></span>
              <span className="colonna" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <span className={`taglia ${c.lingua === 'ja' ? 'jp' : ''}`} style={{ fontWeight: 600 }}>{c.nome}</span>
                <span className="tenue piccolo taglia">{c.set_nome || c.set_id} · {c.numero} · {breveLingua(c.lingua)}{c.variante ? ` · ${c.variante}` : ''}</span>
                <span className="piccolo taglia" style={{ color: 'var(--testo2)' }}>
                  Venduta{c.prezzo_vendita != null ? ` a ${euro(Number(c.prezzo_vendita))}` : ''}{c.data_vendita ? ` il ${new Date(c.data_vendita).toLocaleDateString('it-IT')}` : ''}
                </span>
                <span className="riga a-capo piccolo" style={{ gap: 4, columnGap: 8 }}>
                  <span className="tenue">ora</span>
                  <PrezzoBreve cm={c.cardmarket_id} tp={c.tcgplayer_id} variante={c.variante} />
                  {diff != null && Number(c.prezzo_vendita) > 0 && <span className="tenue mono">({percento(diff / Number(c.prezzo_vendita))} da allora)</span>}
                </span>
              </span>
              <span className="tenue" aria-hidden="true">›</span>
            </Link>
          )
        })}
      </div>
    </main>
  )
}

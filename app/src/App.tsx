import { useEffect, useState } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { ArchivioProvider } from './archivio'
import { Menu, Testata } from './comuni'
import { configurato, supabase } from './supabase'
import { Accesso } from './pagine/Accesso'
import { AggiungiCarta } from './pagine/AggiungiCarta'
import { CollezioneVista } from './pagine/CollezioneVista'
import { Collezioni } from './pagine/Collezioni'
import { Impostazioni, InArrivo } from './pagine/Impostazioni'
import { NuovaCollezione } from './pagine/NuovaCollezione'
import { Scheda } from './pagine/Scheda'
import { TutteLeCarte } from './pagine/TutteLeCarte'

export function App() {
  const [sessione, setSessione] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    if (!configurato) { setSessione(null); return }
    void supabase.auth.getSession().then(({ data }) => setSessione(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessione(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!configurato) {
    return <main className="pagina"><h1>Collezione Pokémon</h1><div className="avviso">L'app non è ancora collegata al database: mancano l'indirizzo e la chiave pubblica di Supabase.</div></main>
  }
  if (sessione === undefined) return null
  if (!sessione) return <Accesso />

  return (
    <HashRouter>
      <ArchivioProvider>
        <Testata />
        <Routes>
          <Route path="/" element={<Collezioni />} />
          <Route path="/carte" element={<TutteLeCarte />} />
          <Route path="/carta/:id" element={<Scheda />} />
          <Route path="/aggiungi" element={<AggiungiCarta />} />
          <Route path="/nuova" element={<NuovaCollezione />} />
          <Route path="/collezione/:id" element={<CollezioneVista />} />
          <Route path="/impostazioni" element={<Impostazioni />} />
          <Route path="/wantlist" element={<InArrivo titolo="Wantlist" testo="La wantlist arriva con la tappa 2." />} />
          <Route path="/viaggio" element={<InArrivo titolo="In viaggio" testo="Gli ordini e le carte in viaggio arrivano con la tappa 2. Per ora puoi segnare una carta come in viaggio dalla sua scheda." />} />
          <Route path="/browser" element={<InArrivo titolo="Browser" testo="Il browser interno arriva con la tappa 4, nelle app per Android e Windows." />} />
          <Route path="*" element={<Collezioni />} />
        </Routes>
        <Menu />
      </ArchivioProvider>
    </HashRouter>
  )
}

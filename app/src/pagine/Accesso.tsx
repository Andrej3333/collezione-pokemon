import { useState } from 'react'
import { supabase } from '../supabase'

export function Accesso() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  async function entra(e: React.FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setErrore(error.message === 'Invalid login credentials' ? 'Email o password non corretti.' : error.message)
    setInvio(false)
  }

  return (
    <main className="pagina" style={{ maxWidth: 420, paddingTop: 48 }}>
      <h1>Collezione Pokémon</h1>
      <p className="tenue" style={{ margin: 0 }}>Entra con l'email e la password che hai creato su Supabase.</p>
      <form className="colonna" style={{ gap: 14 }} onSubmit={entra}>
        <label className="campo">Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="campo">Password
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {errore && <div className="avviso errore">{errore}</div>}
        <button className="btn primario" type="submit" disabled={invio}>{invio ? 'Accesso…' : 'Entra'}</button>
      </form>
    </main>
  )
}

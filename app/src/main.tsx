import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './stile.css'
import { attivaTastoIndietro } from './tasto-indietro'

attivaTastoIndietro()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

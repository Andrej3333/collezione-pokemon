import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// L'app viene pubblicata su GitHub Pages in /collezione-pokemon/
export default defineConfig({
  plugins: [react()],
  base: '/collezione-pokemon/',
  // data della costruzione, mostrata in Impostazioni per sapere quale versione è caricata
  define: { __COSTRUITA__: JSON.stringify(new Date().toISOString()) },
})

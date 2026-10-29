import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// L'app viene pubblicata su GitHub Pages in /collezione-pokemon/
export default defineConfig({
  plugins: [react()],
  base: '/collezione-pokemon/',
})

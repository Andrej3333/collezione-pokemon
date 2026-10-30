import type { CapacitorConfig } from '@capacitor/cli'

// App Android: carica l'interfaccia dal sito pubblicato, così gli aggiornamenti arrivano da soli.
// La parte nativa (browser interno e lettori) è inclusa nell'APK.
const config: CapacitorConfig = {
  appId: 'io.github.andrej3333.collezione',
  appName: 'Collezione Pokémon',
  webDir: 'dist',
  server: {
    url: 'https://andrej3333.github.io/collezione-pokemon/',
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#0f1115',
  },
}

export default config

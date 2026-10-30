import { App as AppNativa } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

// Tasto indietro di Android: chiude il foglio aperto, oppure torna alla pagina precedente;
// solo dalla prima pagina riduce l'app, come le altre app.
export function attivaTastoIndietro(): void {
  if (!Capacitor.isNativePlatform()) return
  void AppNativa.addListener('backButton', () => {
    const foglio = document.querySelector('.foglio-sfondo') as HTMLElement | null
    if (foglio) { foglio.click(); return }
    const inizio = location.hash === '' || location.hash === '#/' || location.hash === '#'
    if (!inizio && window.history.length > 1) window.history.back()
    else if (!inizio) location.hash = '#/'
    else void AppNativa.minimizeApp()
  }).catch(() => {})
}

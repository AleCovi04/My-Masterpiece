import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { closeTopOnBack } from '../hooks/backClose'

/**
 * App Android: il tasto Indietro chiude prima la finestra (o il menu) aperta,
 * senza cambiare pagina; altrimenti torna alla pagina precedente; dalla prima
 * pagina esce dall'app.
 */
export function setupAndroidBack(): void {
  if (!Capacitor.isNativePlatform()) return
  void App.addListener('backButton', ({ canGoBack }) => {
    if (closeTopOnBack()) return
    if (canGoBack) window.history.back()
    else void App.exitApp()
  })
}

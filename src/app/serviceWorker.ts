import { Capacitor } from '@capacitor/core'
import { registerSW } from 'virtual:pwa-register'

/** PWA: funzionamento offline e aggiornamenti automatici. Nell'app Android i file sono già nell'APK. */
export function registerServiceWorker() {
  if (Capacitor.isNativePlatform()) return
  registerSW({ immediate: true })
}

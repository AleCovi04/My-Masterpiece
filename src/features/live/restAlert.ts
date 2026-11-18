// Notifica di fine recupero nell'app Android (Capacitor): suona e vibra anche a
// schermo spento o con l'app in background. Nella PWA non fa nulla.
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

const ID = 7001
const CHANNEL = 'rest'

export interface RestAlertTexts {
  title: string
  body: string
  /** Nome del canale nelle impostazioni di Android. */
  channel: string
}

let ready: Promise<boolean> | null = null

/** Permesso (Android 13+) e canale ad alta priorità con vibrazione, una volta sola. */
async function prepare(channel: string): Promise<boolean> {
  let perm = await LocalNotifications.checkPermissions()
  if (perm.display !== 'granted' && perm.display !== 'denied') {
    perm = await LocalNotifications.requestPermissions()
  }
  if (perm.display !== 'granted') return false
  await LocalNotifications.createChannel({
    id: CHANNEL,
    name: channel,
    importance: 5,
    visibility: 1,
    vibration: true,
  })
  return true
}

export async function cancelRestAlert(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    await LocalNotifications.cancel({ notifications: [{ id: ID }] })
  } catch (error) {
    console.error('Notifica del recupero non annullata', error)
  }
}

/** Programma la notifica per `atMs` (sostituisce quella precedente). */
export async function scheduleRestAlert(
  atMs: number,
  texts: RestAlertTexts,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await cancelRestAlert()
  if (atMs <= Date.now() + 1000) return
  try {
    ready ??= prepare(texts.channel)
    if (!(await ready)) return
    await LocalNotifications.schedule({
      notifications: [
        {
          id: ID,
          title: texts.title,
          body: texts.body,
          channelId: CHANNEL,
          smallIcon: 'ic_stat_rest',
          schedule: { at: new Date(atMs), allowWhileIdle: true },
        },
      ],
    })
  } catch (error) {
    ready = null
    console.error('Notifica del recupero non programmata', error)
  }
}

import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'
import Modal from '../components/ui/Modal'
import { useI18n } from '../i18n/context'
import {
  parseRelease,
  RELEASES_API,
  shouldOfferUpdate,
  SNOOZE_MS,
  type LatestRelease,
} from '../lib/appUpdate'
import { readPreference, writePreference } from '../lib/preferences'

const SNOOZE_KEY = 'mm.updateSnoozedUntil'
/** Numero di build dell'APK, scritto dal workflow `Android APK` (assente in sviluppo e sul sito). */
const INSTALLED = Number(import.meta.env.VITE_APP_BUILD)

/** Solo nell'app Android: all'avvio avvisa se su GitHub c'è un APK più nuovo. */
export default function AppUpdate() {
  const { t } = useI18n()
  const u = t.update
  const [latest, setLatest] = useState<LatestRelease | null>(null)

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !(INSTALLED > 0)) return
    const controller = new AbortController()
    fetch(RELEASES_API, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: unknown) => {
        const release = parseRelease(json)
        const snoozed = Number(readPreference(SNOOZE_KEY)) || null
        if (shouldOfferUpdate(INSTALLED, release, snoozed, Date.now()))
          setLatest(release)
      })
      // offline o GitHub non raggiungibile: si riprova alla prossima apertura
      .catch(() => {})
    return () => controller.abort()
  }, [])

  if (!latest) return null

  const later = () => {
    writePreference(SNOOZE_KEY, String(Date.now() + SNOOZE_MS))
    setLatest(null)
  }
  const update = () => {
    // un indirizzo esterno: Capacitor lo apre nel browser, che scarica l'APK
    window.location.href = latest.url
    setLatest(null)
  }

  return (
    <Modal title={u.title} closeLabel={u.later} onClose={later}>
      <p>
        {u.body
          .replace('{new}', String(latest.build))
          .replace('{old}', String(INSTALLED))}
      </p>
      <p>
        <small>{u.howTo}</small>
      </p>
      <div className="pl-actions">
        <button className="pl-btn acc" type="button" onClick={update}>
          {u.now}
        </button>
        <button className="pl-btn" type="button" onClick={later}>
          {u.later}
        </button>
      </div>
    </Modal>
  )
}

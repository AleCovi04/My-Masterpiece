import { useCallback, useEffect, useRef, useState } from 'react'
import { dataStore } from '../../data'
import type { Exercise, LiveWorkout, Session } from '../../data/types'
import { finishSession, liveActual, resumeLive } from '../../lib/liveWorkout'

/** Percorso della schermata live (un solo allenamento in corso alla volta). */
export const LIVE_PATH = '/allenamento'

interface Loaded {
  workout: LiveWorkout | null
  sessions: Session[]
  exercises: Exercise[]
}

/**
 * Allenamento in corso: lo riprende dal salvataggio e salva subito ogni
 * modifica in IndexedDB, così chiudendo l'app si ritrova tutto com'era.
 */
export function useLiveWorkout() {
  const [data, setData] = useState<Loaded | null>(null)
  const latest = useRef<LiveWorkout | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      dataStore.loadLiveWorkout(),
      dataStore.loadSessions(),
      dataStore.loadExercises(),
    ]).then(([draft, sessions, exercises]) => {
      if (cancelled) return
      const workout = resumeLive(draft, sessions, new Date().toISOString())
      // bozza vecchia (seduta non più in corso) o ricostruita dal piano
      if (workout !== draft) void dataStore.saveLiveWorkout(workout)
      latest.current = workout
      setData({ workout, sessions, exercises })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const change = useCallback((fn: (w: LiveWorkout) => LiveWorkout) => {
    const cur = latest.current
    if (!cur) return
    const next = fn(cur)
    if (next === cur) return
    latest.current = next
    setData((d) => (d ? { ...d, workout: next } : d))
    void dataStore.saveLiveWorkout(next)
  }, [])

  /** Salva l'eseguito (solo serie completate), segna la seduta completata e cancella la bozza. */
  const finish = useCallback(
    async (endedAtMs: number, notes: string) => {
      const w = latest.current
      if (!w || !data) return
      const now = new Date().toISOString()
      const actual = liveActual(w, new Date(endedAtMs).toISOString(), notes)
      const sessions = finishSession(data.sessions, actual, w.sessionId, now)
      await dataStore.saveSessions(sessions)
      await dataStore.saveLiveWorkout(null)
      latest.current = null
      setData({ ...data, sessions, workout: null })
    },
    [data],
  )

  return {
    loading: data === null,
    workout: data?.workout ?? null,
    sessions: data?.sessions ?? [],
    exercises: data?.exercises ?? [],
    change,
    finish,
  }
}

/** Ora corrente, aggiornata ogni `ms` e al ritorno in primo piano. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const id = window.setInterval(tick, ms)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [ms])
  return now
}

/** Schermo sempre acceso finché `active`; il blocco si richiede di nuovo quando l'app torna in primo piano. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !navigator.wakeLock) {
      return
    }
    let lock: WakeLockSentinel | null = null
    let stopped = false
    const request = async () => {
      if (document.visibilityState !== 'visible') return
      if (lock && !lock.released) return
      try {
        const next = await navigator.wakeLock.request('screen')
        if (stopped) void next.release()
        else lock = next
      } catch {
        // negato (batteria scarica, permessi): l'app funziona lo stesso
      }
    }
    void request()
    document.addEventListener('visibilitychange', request)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', request)
      void lock?.release().catch(() => {})
    }
  }, [active])
}

/** C'è un allenamento di forza in corso? Si ricontrolla a ogni cambio di pagina. */
export function useActiveLive(key: string) {
  const [active, setActive] = useState<{ name?: string } | null>(null)
  useEffect(() => {
    let cancelled = false
    Promise.all([dataStore.loadLiveWorkout(), dataStore.loadSessions()]).then(
      ([draft, sessions]) => {
        if (cancelled) return
        const w = resumeLive(draft, sessions, new Date().toISOString())
        const s = w && sessions.find((x) => x.id === w.sessionId)
        setActive(s ? { name: s.name } : null)
      },
    )
    return () => {
      cancelled = true
    }
  }, [key])
  return active
}

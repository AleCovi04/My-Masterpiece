import { useCallback, useEffect, useRef, useState } from 'react'
import { dataStore, useDataRevision } from '../../data'
import type {
  BlockApplication,
  Exercise,
  Id,
  Session,
  Settings,
} from '../../data/types'
import { setSessionRpe } from '../../lib/load'

export interface AnalysisData {
  sessions: Session[]
  applications: BlockApplication[]
  exercises: Exercise[]
  settings: Settings
}

/** Dati dell'Analisi; si possono modificare solo l'RPE mancante di una seduta e le impostazioni. */
export function useAnalysisData(): {
  data: AnalysisData | null
  setRpe: (id: Id, rpe: number) => void
  setSettings: (settings: Settings) => void
} {
  const [data, setData] = useState<AnalysisData | null>(null)
  const latest = useRef<AnalysisData | null>(null)

  const revision = useDataRevision()
  useEffect(() => {
    let cancelled = false
    Promise.all([
      dataStore.loadSessions(),
      dataStore.loadApplications(),
      dataStore.loadExercises(),
      dataStore.loadSettings(),
    ]).then(([sessions, applications, exercises, settings]) => {
      if (cancelled) return
      latest.current = { sessions, applications, exercises, settings }
      setData(latest.current)
    })
    return () => {
      cancelled = true
    }
  }, [revision])

  const setRpe = useCallback((id: Id, rpe: number) => {
    const d = latest.current
    if (!d) return
    const now = new Date().toISOString()
    const next = { ...d, sessions: setSessionRpe(d.sessions, id, rpe, now) }
    latest.current = next
    setData(next)
    void dataStore.saveSessions(next.sessions)
  }, [])

  const setSettings = useCallback((settings: Settings) => {
    const d = latest.current
    if (!d) return
    const next = { ...d, settings }
    latest.current = next
    setData(next)
    void dataStore.saveSettings(settings)
  }, [])

  return { data, setRpe, setSettings }
}

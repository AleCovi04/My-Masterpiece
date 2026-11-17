import { useEffect, useState } from 'react'
import { dataStore } from '../../data'
import type { BlockApplication, Exercise, Session } from '../../data/types'

export interface AnalysisData {
  sessions: Session[]
  applications: BlockApplication[]
  exercises: Exercise[]
}

/** Dati in sola lettura per l'Analisi. */
export function useAnalysisData(): AnalysisData | null {
  const [data, setData] = useState<AnalysisData | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      dataStore.loadSessions(),
      dataStore.loadApplications(),
      dataStore.loadExercises(),
    ]).then(([sessions, applications, exercises]) => {
      if (!cancelled) setData({ sessions, applications, exercises })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return data
}

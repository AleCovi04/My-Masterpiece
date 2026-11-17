import { useEffect, useState } from 'react'
import { dataStore } from '../../data'
import type { BlockApplication, Session } from '../../data/types'

export interface AnalysisData {
  sessions: Session[]
  applications: BlockApplication[]
}

/** Dati in sola lettura per l'Analisi. */
export function useAnalysisData(): AnalysisData | null {
  const [data, setData] = useState<AnalysisData | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([dataStore.loadSessions(), dataStore.loadApplications()]).then(
      ([sessions, applications]) => {
        if (!cancelled) setData({ sessions, applications })
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  return data
}

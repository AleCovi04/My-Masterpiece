import { useCallback, useEffect, useState } from 'react'
import { dataStore, useDataRevision } from '../../data'
import type { IsoDate, Session } from '../../data/types'

interface Loaded {
  sessions: Session[]
  raceDate: IsoDate | null
}

export function useOverviewData() {
  const [data, setData] = useState<Loaded | null>(null)

  const revision = useDataRevision()
  useEffect(() => {
    let cancelled = false
    Promise.all([dataStore.loadSessions(), dataStore.loadRaceDate()]).then(
      ([sessions, raceDate]) => {
        if (!cancelled) setData({ sessions, raceDate })
      },
    )
    return () => {
      cancelled = true
    }
  }, [revision])

  const setRaceDate = useCallback((raceDate: IsoDate | null) => {
    setData((d) => (d ? { ...d, raceDate } : d))
    void dataStore.saveRaceDate(raceDate)
  }, [])

  return { data, setRaceDate }
}

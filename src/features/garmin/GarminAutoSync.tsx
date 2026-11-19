import { useEffect } from 'react'
import { setGarminChooser, syncGarmin } from './sync'
import { useGarminImport } from './useGarminImport'

/**
 * Nella cornice dell'app: controlla le attività nuove su intervals.icu
 * all'apertura e quando l'app torna visibile (al massimo una volta all'ora),
 * e mostra la scelta della seduta quando serve.
 */
export default function GarminAutoSync() {
  const garmin = useGarminImport()

  useEffect(() => {
    setGarminChooser(garmin.choose)
  })

  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible') void syncGarmin(true)
    }
    // dopo l'avvio, senza rallentarlo
    const timer = setTimeout(check, 4000)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  return garmin.element
}

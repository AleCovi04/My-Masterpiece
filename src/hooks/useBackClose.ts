import { useEffect, useRef } from 'react'
import { registerBackClose } from './backClose'

/** Finché `active`, il tasto Indietro di Android chiama `onClose` invece di cambiare pagina. */
export function useBackClose(active: boolean, onClose: () => void) {
  const ref = useRef(onClose)
  useEffect(() => {
    ref.current = onClose
  })
  useEffect(() => {
    if (!active) return
    return registerBackClose(() => ref.current())
  }, [active])
}

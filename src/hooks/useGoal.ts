import { useEffect, useSyncExternalStore } from 'react'
import { dataStore, useDataRevision } from '../data'
import { normalizeGoal } from '../data/validate'

// Obiettivo ("Road to …") condiviso da intestazione, menu e Panoramica:
// una sola copia in memoria, ricaricata quando arrivano dati da un altro dispositivo.
let goal: string | undefined
const listeners = new Set<() => void>()

const setLocal = (next: string | undefined) => {
  if (next === goal) return
  goal = next
  listeners.forEach((fn) => fn())
}

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** L'obiettivo impostato (o `undefined`), sempre aggiornato. */
export function useGoal(): string | undefined {
  const revision = useDataRevision()
  useEffect(() => {
    let cancelled = false
    void dataStore.loadSettings().then((s) => {
      if (!cancelled) setLocal(s.goal)
    })
    return () => {
      cancelled = true
    }
  }, [revision])
  return useSyncExternalStore(subscribe, () => goal)
}

/** Salva l'obiettivo nelle impostazioni (sincronizzate); testo vuoto = nessuno. */
export async function saveGoal(raw: string): Promise<void> {
  const next = normalizeGoal(raw)
  const { goal: _old, ...rest } = await dataStore.loadSettings()
  void _old
  await dataStore.saveSettings(next ? { ...rest, goal: next } : rest)
  setLocal(next)
}

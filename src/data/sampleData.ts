// Catalogo esercizi iniziale. Le sedute non hanno dati di esempio: esistono solo quelle create dall'utente.
import type { Exercise } from './types'
import { DEFAULT_REST_SECONDS } from './types'

/** Catalogo iniziale: quattro esercizi di base. */
export function generateSampleExercises(now: Date = new Date()): Exercise[] {
  const stamp = now.toISOString()
  const defs: [string, string, Exercise['muscles']][] = [
    [
      'sample-panca',
      'Panca piana',
      [
        { muscle: 'chest', percent: 100 },
        { muscle: 'front_delts', percent: 60 },
        { muscle: 'triceps', percent: 40 },
      ],
    ],
    [
      'sample-lat-machine',
      'Lat machine',
      [
        { muscle: 'lats', percent: 100 },
        { muscle: 'biceps', percent: 50 },
        { muscle: 'rear_delts', percent: 30 },
      ],
    ],
    [
      'sample-leg-press',
      'Leg press',
      [
        { muscle: 'quads', percent: 100 },
        { muscle: 'glutes', percent: 60 },
        { muscle: 'hamstrings', percent: 30 },
      ],
    ],
    [
      'sample-rematore',
      'Rematore',
      [
        { muscle: 'mid_back', percent: 100 },
        { muscle: 'lats', percent: 70 },
        { muscle: 'biceps', percent: 40 },
      ],
    ],
  ]
  return defs.map(([id, name, muscles]) => ({
    id,
    name,
    muscles,
    defaultRestSeconds: DEFAULT_REST_SECONDS,
    archived: false,
    createdAt: stamp,
    updatedAt: stamp,
  }))
}

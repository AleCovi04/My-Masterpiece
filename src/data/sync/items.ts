// Una voce arrivata dal server: migrata alla versione attuale e validata.
import { migrate, type RawData } from '../migrations'
import { sanitize } from '../validate'
import type { ListKind, MetaId } from './types'

const emptyRaw = (): RawData => ({
  exercises: [],
  templates: [],
  sessions: [],
  blocks: [],
  phases: [],
  applications: [],
  raceDate: null,
})

/** L'entità valida alla versione attuale, o `null` se non è valida. */
export function normalizeListItem(
  kind: ListKind,
  item: unknown,
  schemaVersion: number,
): { id: string } | null {
  const raw = { ...emptyRaw(), [kind]: [item] }
  const list = sanitize(migrate(raw, schemaVersion)).data[kind]
  return list[0] ?? null
}

/** Il valore valido di `meta` alla versione attuale. */
export function normalizeMeta(
  id: MetaId,
  value: unknown,
  schemaVersion: number,
): unknown {
  const raw: RawData = { ...emptyRaw(), [id]: value }
  return sanitize(migrate(raw, schemaVersion)).data[id]
}

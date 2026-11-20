import { StoreUnavailableError, SyncFailedError } from '../../data/sync/account'
import type { Dictionary } from '../../i18n/it'

/** Messaggio di errore di uno strumento del server, nella lingua dell'app quando è noto. */
export function toolError(e: unknown, t: Dictionary): string {
  if (e instanceof StoreUnavailableError) return t.storage.toolsBlocked
  if (e instanceof SyncFailedError) return t.storage.syncFailed
  return e instanceof Error ? e.message : String(e)
}

// Il server della sincronizzazione su Supabase: tabella `items` e funzione `push_items`
// (vedi `supabase/schema.sql`).
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RemoteChange, SyncChange, SyncKind, SyncRemote } from './types'

/** Righe per pagina in lettura. */
const PAGE = 1000

interface ItemRow {
  kind: SyncKind
  id: string
  pos: number
  item: unknown
  deleted: boolean
  updated_at: string
  server_at: string
  schema_version: number
}

/** Le ore di Postgres ("2026-11-18 10:00:00.123+00") in ISO con i millisecondi. */
const iso = (v: string) => new Date(v).toISOString()

export function createSupabaseRemote(client: SupabaseClient): SyncRemote {
  return {
    async pull(since) {
      const out: RemoteChange[] = []
      for (let from = 0; ; from += PAGE) {
        let query = client
          .from('items')
          .select(
            'kind, id, pos, item, deleted, updated_at, server_at, schema_version',
          )
          .order('server_at')
          .order('kind')
          .order('id')
          .range(from, from + PAGE - 1)
        if (since) query = query.gt('server_at', since)
        const { data, error } = await query
        if (error) throw error
        const rows = (data ?? []) as ItemRow[]
        for (const r of rows) {
          out.push({
            kind: r.kind,
            id: r.id,
            pos: r.pos,
            item: r.item,
            deleted: r.deleted,
            updatedAt: iso(r.updated_at),
            serverAt: iso(r.server_at),
            schemaVersion: r.schema_version,
          })
        }
        if (rows.length < PAGE) return out
      }
    },

    async push(changes: SyncChange[]) {
      if (changes.length === 0) return
      const rows = changes.map((c) => ({
        kind: c.kind,
        id: c.id,
        pos: c.pos,
        item: c.deleted ? null : c.item,
        deleted: c.deleted,
        updated_at: c.updatedAt,
        schema_version: c.schemaVersion,
      }))
      const { error } = await client.rpc('push_items', { rows })
      if (error) throw error
    },
  }
}

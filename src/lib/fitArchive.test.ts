import { unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import type { ImportRecord, Session } from '../data/types'
import {
  archiveCandidates,
  archiveCutoff,
  archiveEntryName,
  archiveFileName,
  buildArchive,
} from './fitArchive'

const rec = (
  id: string,
  startedAt: string,
  extra: Partial<ImportRecord> = {},
): ImportRecord => ({
  id,
  createdAt: startedAt,
  updatedAt: startedAt,
  source: 'file',
  startedAt,
  ...extra,
})

describe('archiviazione dei FIT', () => {
  const now = new Date(2026, 10, 19, 12)

  it('limite: N anni fa', () => {
    expect(archiveCutoff(now, 2).slice(0, 4)).toBe('2024')
  })

  it('sceglie solo le attività vecchie, con file e non già archiviate', () => {
    const cutoff = archiveCutoff(now, 2)
    const list = [
      rec('nuova', '2026-01-10T07:00:00.000Z'),
      rec('vecchia-b', '2024-03-01T07:00:00.000Z'),
      rec('vecchia-a', '2023-05-01T07:00:00.000Z'),
      rec('ignorata', '2023-01-01T07:00:00.000Z', { ignored: true }),
      rec('archiviata', '2023-02-01T07:00:00.000Z', { archived: true }),
    ]
    expect(archiveCandidates(list, cutoff).map((r) => r.id)).toEqual([
      'vecchia-a',
      'vecchia-b',
    ])
  })

  it('nome nello zip con data, sport e id', () => {
    const r = rec('123/45:6', '2024-03-01T07:00:00.000Z', { sessionId: 's1' })
    const sessions = [{ id: 's1', discipline: 'run' }] as unknown as Session[]
    expect(archiveEntryName(r, sessions)).toBe('2024-03-01_run_123_45_6.fit')
    expect(archiveEntryName(r, [])).toBe('2024-03-01_activity_123_45_6.fit')
    expect(archiveFileName(archiveCutoff(now, 2))).toBe(
      'my-masterpiece-fit-2024-11-19.zip',
    )
  })

  it('lo zip contiene i file intatti', () => {
    const zip = buildArchive([
      { name: 'a.fit', bytes: new Uint8Array([1, 2, 3]) },
      { name: 'b.fit', bytes: new Uint8Array([4, 5]) },
    ])
    const out = unzipSync(zip)
    expect(Object.keys(out).sort()).toEqual(['a.fit', 'b.fit'])
    expect(out['a.fit']).toEqual(new Uint8Array([1, 2, 3]))
  })
})

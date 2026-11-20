import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ImportRecord } from '../../data/types'

const store = vi.hoisted(() => ({
  imports: [] as ImportRecord[],
  files: new Map<string, Uint8Array>(),
  loadSessions: vi.fn(async () => []),
  loadImports: vi.fn(async () => store.imports),
  update: vi.fn(
    async (
      _keys: string[],
      fn: (cur: {
        imports: ImportRecord[]
      }) => { imports?: ImportRecord[] } | null,
    ) => {
      const patch = fn({ imports: store.imports })
      if (patch?.imports) store.imports = patch.imports
      return { imports: store.imports }
    },
  ),
  putFitFile: vi.fn(async (id: string, bytes: Uint8Array) => {
    store.files.set(id, bytes)
  }),
}))
const uploadFitFiles = vi.hoisted(() => vi.fn(async () => {}))

vi.mock('../../data', () => ({
  dataStore: store,
  account: { uploadFitFiles },
  refreshData: vi.fn(),
}))
vi.mock('../../lib/fit/decode', () => ({
  readFit: async () => ({
    key: 'fit-1',
    startedAt: '2024-03-01T07:00:00.000Z',
    sessions: [{ discipline: 'run' }],
  }),
}))

const { importFit } = await import('./importer')

const record = (extra: Partial<ImportRecord> = {}): ImportRecord => ({
  id: 'fit-1',
  createdAt: '2024-03-01T09:00:00.000Z',
  updatedAt: '2024-03-01T09:00:00.000Z',
  source: 'file',
  startedAt: '2024-03-01T07:00:00.000Z',
  sessionId: 's1',
  ...extra,
})

describe('import di un FIT archiviato', () => {
  beforeEach(() => {
    store.files.clear()
    vi.clearAllMocks()
  })

  it('il file torna e la seduta non cambia', async () => {
    store.imports = [record({ archived: true })]
    const bytes = new Uint8Array([1, 2, 3])
    const out = await importFit(bytes, { source: 'file', targetId: 's1' })
    expect(out.status).toBe('restored')
    expect(store.files.get('fit-1')).toEqual(bytes)
    expect(store.imports[0].archived).toBeUndefined()
    expect(store.imports[0].sessionId).toBe('s1')
    expect(store.update).toHaveBeenCalledTimes(1)
    expect(uploadFitFiles).toHaveBeenCalled()
  })

  it('un file già presente e non archiviato resta un doppione', async () => {
    store.imports = [record()]
    const out = await importFit(new Uint8Array([1]), { source: 'file' })
    expect(out.status).toBe('duplicate')
    expect(store.putFitFile).not.toHaveBeenCalled()
  })
})

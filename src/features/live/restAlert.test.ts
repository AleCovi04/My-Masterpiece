import { beforeEach, describe, expect, it, vi } from 'vitest'

const native = { value: true }
const ln = vi.hoisted(() => ({
  checkPermissions: vi.fn(async () => ({ display: 'prompt' })),
  requestPermissions: vi.fn(async () => ({ display: 'granted' })),
  createChannel: vi.fn(async () => {}),
  schedule: vi.fn(async () => ({ notifications: [] })),
  cancel: vi.fn(async () => {}),
}))
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => native.value },
}))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: ln }))

const texts = { title: 'Recupero finito', body: 'Via', channel: 'Recupero' }

describe('notifica di fine recupero', () => {
  beforeEach(() => {
    vi.resetModules()
    Object.values(ln).forEach((f) => f.mockClear())
    native.value = true
  })

  it('nell’app nativa chiede il permesso una volta e programma la notifica', async () => {
    const { scheduleRestAlert } = await import('./restAlert')
    const at = Date.now() + 90_000
    await scheduleRestAlert(at, texts)
    await scheduleRestAlert(at + 15_000, texts)
    expect(ln.requestPermissions).toHaveBeenCalledTimes(1)
    expect(ln.createChannel).toHaveBeenCalledTimes(1)
    expect(ln.schedule).toHaveBeenCalledTimes(2)
    expect(ln.cancel).toHaveBeenCalledTimes(2) // sostituisce la precedente
    const call = ln.schedule.mock.calls[1] as unknown as [
      { notifications: { title: string; schedule: { at: Date } }[] },
    ]
    const n = call[0].notifications[0]
    expect(n.schedule.at.getTime()).toBe(at + 15_000)
    expect(n.title).toBe('Recupero finito')
  })

  it('non programma un recupero già finito e non fa nulla senza permesso', async () => {
    ln.requestPermissions.mockResolvedValueOnce({ display: 'denied' })
    const { scheduleRestAlert } = await import('./restAlert')
    await scheduleRestAlert(Date.now() - 1000, texts)
    expect(ln.schedule).not.toHaveBeenCalled()
    await scheduleRestAlert(Date.now() + 60_000, texts)
    expect(ln.schedule).not.toHaveBeenCalled()
  })

  it('nella PWA non tocca il plugin', async () => {
    native.value = false
    const { scheduleRestAlert, cancelRestAlert } = await import('./restAlert')
    await scheduleRestAlert(Date.now() + 60_000, texts)
    await cancelRestAlert()
    expect(ln.schedule).not.toHaveBeenCalled()
    expect(ln.cancel).not.toHaveBeenCalled()
  })
})

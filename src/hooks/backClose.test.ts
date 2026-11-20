import { describe, expect, it, vi } from 'vitest'
import { closeTopOnBack, registerBackClose } from './backClose'

describe('tasto Indietro (B11)', () => {
  it('chiude solo l’ultima cosa aperta, poi quella sotto', () => {
    const page = vi.fn()
    const dialog = vi.fn()
    const offPage = registerBackClose(page)
    const offDialog = registerBackClose(dialog)
    expect(closeTopOnBack()).toBe(true)
    expect(dialog).toHaveBeenCalledTimes(1)
    expect(page).not.toHaveBeenCalled()
    offDialog() // la finestra si è chiusa
    expect(closeTopOnBack()).toBe(true)
    expect(page).toHaveBeenCalledTimes(1)
    offPage()
  })

  it('senza niente di aperto non gestisce il tasto (si cambia pagina)', () => {
    expect(closeTopOnBack()).toBe(false)
  })

  it('una finestra che resta aperta (salvataggio in corso) tiene il tasto', () => {
    const busy = vi.fn() // non si chiude
    const off = registerBackClose(busy)
    expect(closeTopOnBack()).toBe(true)
    expect(closeTopOnBack()).toBe(true)
    expect(busy).toHaveBeenCalledTimes(2)
    off()
  })
})

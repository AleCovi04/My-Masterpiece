import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ErrorBoundary from './ErrorBoundary'

const texts = {
  title: 'Qualcosa è andato storto',
  body: 'Questa pagina ha avuto un errore.',
  reload: 'Ricarica',
  toData: 'Vai a Dati',
}

describe('ErrorBoundary (B9)', () => {
  it('senza errori mostra la pagina', () => {
    const html = renderToStaticMarkup(
      <ErrorBoundary texts={texts}>
        <p>pagina</p>
      </ErrorBoundary>,
    )
    expect(html).toBe('<p>pagina</p>')
  })

  it('dopo un errore mostra il messaggio, Ricarica e Vai a Dati', () => {
    const state = ErrorBoundary.getDerivedStateFromError(new Error('boom'))
    const b = new ErrorBoundary({ texts, children: <p>pagina</p> })
    b.state = state
    const html = renderToStaticMarkup(<MemoryRouter>{b.render()}</MemoryRouter>)
    expect(html).toContain(texts.title)
    expect(html).toContain('boom')
    expect(html).toContain(texts.reload)
    expect(html).toContain('href="/dati"')
    expect(html).not.toContain('pagina</p>')
  })
})

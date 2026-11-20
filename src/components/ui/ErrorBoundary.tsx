import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

export interface ErrorTexts {
  title: string
  body: string
  reload: string
  toData: string
}

interface Props {
  texts: ErrorTexts
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Un errore nel disegno di una pagina mostra un messaggio al posto della
 * pagina, invece dello schermo bianco: menu e intestazione restano usabili.
 * Si azzera cambiando pagina (la chiave è il percorso, vedi AppShell).
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Errore nella pagina', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const t = this.props.texts
    return (
      <section className="page-error" role="alert">
        <h1 className="pl-title">{t.title}</h1>
        <p>{t.body}</p>
        <p className="page-error-detail">{error.message}</p>
        <div className="pl-actions">
          <button
            type="button"
            className="pl-btn acc"
            onClick={() => window.location.reload()}
          >
            {t.reload}
          </button>
          <Link className="pl-btn" to="/dati">
            {t.toData}
          </Link>
        </div>
      </section>
    )
  }
}

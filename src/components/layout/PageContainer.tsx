import type { ReactNode } from 'react'
import './layout.css'

/**
 * Contenitore di ogni pagina: su telefono/tablet è una colonna a tutta larghezza,
 * da 1024 px in su è centrato con larghezza massima ~1300 px.
 */
export default function PageContainer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`page${className ? ` ${className}` : ''}`}>{children}</div>
  )
}

type Cols = 2 | 3 | 4

/**
 * Griglia di blocchi: una colonna sotto i 1024 px, `cols` colonne da PC.
 * `cards` = 2 colonne da 1024 px e 3 da 1280 px (liste di card).
 */
export function Grid({
  cols,
  cards,
  className,
  children,
}: {
  cols?: Cols
  cards?: boolean
  className?: string
  children: ReactNode
}) {
  const cls = [
    'l-grid',
    cols && `l-cols-${cols}`,
    cards && 'l-cards',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return <div className={cls}>{children}</div>
}

import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../../i18n/context'
import { LIVE_PATH, useActiveLive } from './hooks'
import './live.css'

/** "Allenamento in corso → Riprendi", su ogni pagina tranne quella live. */
export default function LiveBanner() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const active = useActiveLive(pathname)
  if (!active || pathname === LIVE_PATH) return null
  return (
    <Link className="live-banner" to={LIVE_PATH}>
      <i aria-hidden="true" />
      <span>
        {t.live.banner}
        {active.name ? ` · ${active.name}` : ''}
      </span>
      <b>{t.live.resume} →</b>
    </Link>
  )
}

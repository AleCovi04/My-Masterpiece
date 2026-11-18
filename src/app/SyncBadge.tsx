import { Link } from 'react-router-dom'
import { CloudIcon } from '../components/ui/Icons'
import { useAccount } from '../data'
import { useI18n } from '../i18n/context'

/** Icona dello stato della sincronizzazione (solo con un account collegato); porta alla pagina Dati. */
export default function SyncBadge() {
  const { t } = useI18n()
  const state = useAccount()
  if (!state.available || !state.email) return null
  const label = `${t.sync.badge}: ${t.sync.status[state.status]}`
  return (
    <Link
      to="/dati"
      className={`icon-btn sync-badge is-${state.status}`}
      aria-label={label}
      title={label}
    >
      <CloudIcon />
    </Link>
  )
}

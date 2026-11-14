import { useI18n } from '../../i18n/context'

export default function CalendarPage() {
  const { t } = useI18n()
  return (
    <>
      <h1 className="placeholder-title">{t.calendar.title}</h1>
      <div className="ph">{t.calendar.soon}</div>
    </>
  )
}

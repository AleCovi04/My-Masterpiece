import { useState, type FormEvent } from 'react'
import { account, useAccount } from '../../data'
import { NotRegisteredError } from '../../data/sync/account'
import type { IsoDateTime } from '../../data/types'
import { useI18n } from '../../i18n/context'

/** Account e sincronizzazione: accesso con codice via email, stato, uscita. */
export default function AccountCard({
  dateTime,
}: {
  dateTime: (iso: IsoDateTime) => string
}) {
  const { t } = useI18n()
  const s = t.sync
  const state = useAccount()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOut, setConfirmOut] = useState(false)

  const run = async (
    action: () => Promise<void>,
    failed: string | ((e: unknown) => string),
  ) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      console.error(e)
      setError(typeof failed === 'string' ? failed : failed(e))
    } finally {
      setBusy(false)
    }
  }

  const send = (ev: FormEvent) => {
    ev.preventDefault()
    void run(
      async () => {
        await account.sendCode(email.trim())
        setSent(true)
      },
      (e) => (e instanceof NotRegisteredError ? s.notRegistered : s.sendFailed),
    )
  }

  const verify = (ev: FormEvent) => {
    ev.preventDefault()
    void run(async () => {
      await account.verifyCode(email.trim(), code.trim())
      setSent(false)
      setCode('')
    }, s.verifyFailed)
  }

  const signOut = () => {
    setConfirmOut(false)
    void run(() => account.signOut(), t.data.failed)
  }

  return (
    <section className="dt-card dt-account">
      <h2>{s.title}</h2>
      <p>{s.intro}</p>

      {!state.available ? (
        <p className="dt-reminder">{s.unavailable}</p>
      ) : state.email ? (
        <>
          <p className="dt-meta">
            {s.signedInAs} <b>{state.email}</b>
          </p>
          <p
            className={`dt-sync is-${state.status}`}
            role={state.status === 'error' ? 'alert' : 'status'}
          >
            {s.status[state.status]}
          </p>
          <p className="dt-meta">
            {s.lastSync}:{' '}
            <b>{state.lastSyncAt ? dateTime(state.lastSyncAt) : s.never}</b>
          </p>
          {error && <p className="dt-reminder">{error}</p>}
          <div className="dt-actions">
            <button
              type="button"
              className="pl-btn acc"
              disabled={busy || state.status === 'syncing'}
              onClick={() => void account.syncNow()}
            >
              {s.syncNow}
            </button>
            {confirmOut ? (
              <span className="pl-confirm">
                <small>{s.confirmSignOut}</small>
                <button
                  type="button"
                  className="pl-btn warn pl-small"
                  onClick={signOut}
                >
                  {s.signOutYes}
                </button>
                <button
                  type="button"
                  className="pl-btn pl-small"
                  onClick={() => setConfirmOut(false)}
                >
                  {s.cancel}
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="pl-btn"
                disabled={busy}
                onClick={() => setConfirmOut(true)}
              >
                {s.signOut}
              </button>
            )}
          </div>
        </>
      ) : !sent ? (
        <form className="dt-login" onSubmit={send}>
          <label>
            <span>{s.email}</span>
            <input
              type="email"
              className="pl-inp"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {error && <p className="dt-reminder">{error}</p>}
          <div className="dt-actions">
            <button type="submit" className="pl-btn acc" disabled={busy}>
              {s.sendCode}
            </button>
          </div>
        </form>
      ) : (
        <form className="dt-login" onSubmit={verify}>
          <p>{s.codeSent}</p>
          <label>
            <span>{s.code}</span>
            <input
              type="text"
              className="pl-inp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,10}"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          {error && <p className="dt-reminder">{error}</p>}
          <div className="dt-actions">
            <button type="submit" className="pl-btn acc" disabled={busy}>
              {s.signIn}
            </button>
            <button
              type="button"
              className="pl-btn"
              disabled={busy}
              onClick={() => {
                setSent(false)
                setCode('')
                setError(null)
              }}
            >
              {s.changeEmail}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

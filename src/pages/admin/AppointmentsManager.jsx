// Appointments — guided call → confirm → complete workflow for repair bookings, plus a permanent,
// searchable history. Tabs: Needs action (new), Called, Confirmed, History (completed / cancelled /
// no-show). Every step goes through a confirmation dialog; the database enforces the step order and
// stamps who did each step and when (lib/appointments.js has the shared rules and formatting).
// Nothing is ever deleted here. The list refreshes when AdminLayout reports a bookings change
// (Supabase Realtime, with a 30 s polling fallback).
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  STATUS_LABEL, STATUS_BADGE, PAYMENT_METHODS, ARCHIVED_STATUSES,
  storeLocalToISO, isoToStoreLocal, fmtStamp, fmtRequested, fmtMoney, appointmentDate,
  appendNote, timeline, toCSV,
} from '../../lib/appointments'
import { storeDateStr } from '../../lib/hours'
import AdminModal from './AdminModal'
import Toast from './Toast'
import './Appointments.css'

const TABS = [
  { key: 'new', label: 'Needs action' },
  { key: 'called', label: 'Called' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'history', label: 'History' },
]

const telHref = phone => `tel:${String(phone ?? '').replace(/[^\d+]/g, '')}`
const digits = s => String(s ?? '').replace(/\D/g, '')

export default function AppointmentsManager() {
  const { bookingsVersion = 0, userEmail = '', refreshAlerts } = useOutletContext() ?? {}
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [tab, setTab] = useState('new')
  const [dialog, setDialog] = useState(null) // { kind, booking }
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const load = useCallback(() => {
    return supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        setLoading(false)
        if (error) { console.error('bookings fetch error:', error); setLoadError(error.message); return }
        setLoadError(null)
        setRows(data ?? [])
      })
  }, [])

  useEffect(() => { load() }, [load, bookingsVersion])

  const byStatus = useMemo(() => {
    const g = { new: [], called: [], confirmed: [], history: [] }
    for (const r of rows) {
      if (ARCHIVED_STATUSES.includes(r.status)) g.history.push(r)
      else if (g[r.status]) g[r.status].push(r)
    }
    const slot = r => `${r.booking_date}T${r.booking_time}`
    g.new.sort((a, b) => a.created_at.localeCompare(b.created_at))   // waiting longest first
    g.called.sort((a, b) => slot(a).localeCompare(slot(b)))           // soonest request first
    g.confirmed.sort((a, b) => a.confirmed_time.localeCompare(b.confirmed_time))
    return g
  }, [rows])

  // Runs one workflow step; the dialog stays open (with the error) if the database refuses it.
  async function runStep(booking, changes, successMessage) {
    const { data, error } = await supabase
      .from('bookings')
      .update(changes)
      .eq('id', booking.id)
      .eq('status', booking.status) // someone else already moved it? then nothing is updated
      .select()
    if (error) return error.message
    if (!data?.length) {
      await load()
      return 'This appointment was changed by someone else. The list has been refreshed.'
    }
    setRows(prev => prev.map(r => (r.id === booking.id ? data[0] : r)))
    refreshAlerts?.()
    setDialog(null)
    showToast(successMessage)
    return null
  }

  return (
    <div className="appt-page">
      <div className="adm-page-header">
        <h1>Appointments</h1>
        <p>Call every new request, confirm a time, then complete it with the payment. Finished appointments move to History.</p>
      </div>

      <div className="appt-tabs" role="tablist" aria-label="Appointment status">
        {TABS.map(t => {
          const count = byStatus[t.key].length
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`appt-tab${tab === t.key ? ' active' : ''}${t.key === 'new' && count > 0 ? ' urgent' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {t.key !== 'history' && <span className="appt-tab-count">{count}</span>}
            </button>
          )
        })}
      </div>

      {loadError && <div className="adm-form-err" style={{ marginBottom: 16 }}>Couldn’t load appointments: {loadError}</div>}

      {loading ? (
        <div className="adm-loading"><div className="adm-spinner" /><span>Loading appointments…</span></div>
      ) : tab === 'history' ? (
        <History rows={byStatus.history} />
      ) : byStatus[tab].length === 0 ? (
        <div className="adm-table-card">
          <div className="adm-empty">
            <div className="adm-empty-title">
              {tab === 'new' ? 'No new requests. You’re all caught up.' : tab === 'called' ? 'Nobody is waiting for a confirmed time.' : 'No upcoming confirmed appointments.'}
            </div>
          </div>
        </div>
      ) : (
        <div className="appt-list">
          {byStatus[tab].map(b => (
            <AppointmentCard key={b.id} booking={b} onAction={kind => setDialog({ kind, booking: b })} />
          ))}
        </div>
      )}

      {dialog && (
        <StepDialog
          kind={dialog.kind}
          booking={dialog.booking}
          userEmail={userEmail}
          onClose={() => setDialog(null)}
          onRun={runStep}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}

// ── Active appointment card ──────────────────────────────────────────────────

function AppointmentCard({ booking: b, onAction }) {
  return (
    <article className={`appt-card appt-card-${b.status}`}>
      <div className="appt-card-hd">
        <div>
          <h2 className="appt-name">{b.customer_name}</h2>
          <div className="appt-received">Received {fmtStamp(b.created_at)}</div>
        </div>
        <span className={STATUS_BADGE[b.status]}>{STATUS_LABEL[b.status]}</span>
      </div>

      <a className="appt-call" href={telHref(b.customer_phone)}>
        <PhoneIcon />
        <span>
          <span className="appt-call-label">Tap to call</span>
          <span className="appt-call-number">{b.customer_phone}</span>
        </span>
      </a>

      <Details booking={b} />
      <Timeline booking={b} />

      <div className="appt-actions">
        {b.status === 'new' && (
          <>
            <button type="button" className="adm-btn adm-btn-primary" onClick={() => onAction('called')}>I called the customer</button>
            <button type="button" className="adm-btn adm-btn-secondary" onClick={() => onAction('no_answer')}>Log no answer</button>
          </>
        )}
        {b.status === 'called' && (
          <button type="button" className="adm-btn adm-btn-primary" onClick={() => onAction('confirmed')}>Confirm appointment</button>
        )}
        {b.status === 'confirmed' && (
          <button type="button" className="adm-btn adm-btn-primary" onClick={() => onAction('completed')}>Complete</button>
        )}
        <span className="appt-actions-spacer" />
        <button type="button" className="adm-btn adm-btn-ghost" onClick={() => onAction('no_show')}>No-show</button>
        <button type="button" className="adm-btn adm-btn-danger-ghost" onClick={() => onAction('cancelled')}>Cancel</button>
      </div>
    </article>
  )
}

function Details({ booking: b, full = false }) {
  return (
    <dl className="appt-details">
      <div><dt>Repair</dt><dd>{b.service_name || '—'}</dd></div>
      <div><dt>Device &amp; issue</dt><dd className="appt-pre">{b.notes || '—'}</dd></div>
      <div><dt>Requested</dt><dd>{fmtRequested(b)}</dd></div>
      {b.confirmed_time && <div><dt>Confirmed for</dt><dd><strong>{fmtStamp(b.confirmed_time)}</strong></dd></div>}
      {b.call_attempts > 0 && <div><dt>Unanswered calls</dt><dd>{b.call_attempts}</dd></div>}
      {b.call_notes && <div className="appt-wide"><dt>Call notes</dt><dd className="appt-pre">{b.call_notes}</dd></div>}
      {full && b.status === 'completed' && (
        <div><dt>Paid</dt><dd>{fmtMoney(b.amount_paid)} · {PAYMENT_METHODS.find(m => m.value === b.payment_method)?.label ?? b.payment_method}</dd></div>
      )}
      {b.admin_notes && <div className="appt-wide"><dt>Admin notes</dt><dd className="appt-pre">{b.admin_notes}</dd></div>}
      {full && <div><dt>Phone</dt><dd><a href={telHref(b.customer_phone)}>{b.customer_phone}</a></dd></div>}
    </dl>
  )
}

function Timeline({ booking }) {
  return (
    <ol className="appt-timeline" aria-label="Status timeline">
      {timeline(booking).map(s => (
        <li key={s.key} className={`appt-step${s.done ? ' done' : ''}${s.end === 'stop' ? ' stop' : ''}`}>
          <span className="appt-step-dot" aria-hidden="true" />
          <span className="appt-step-body">
            <span className="appt-step-label">{s.label}</span>
            {(s.at || s.by || s.detail) && (
              <span className="appt-step-meta">
                {[s.detail, s.at && fmtStamp(s.at), s.by].filter(Boolean).join(' · ')}
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  )
}

// ── Step dialogs ─────────────────────────────────────────────────────────────

const DIALOG_COPY = {
  no_answer: { title: 'Log a call with no answer', button: 'Log no answer', success: 'No answer logged. The request stays in Needs action.' },
  called: { title: 'Mark as called', button: 'Yes, I called them', success: 'Marked as called.' },
  confirmed: { title: 'Confirm appointment', button: 'Confirm appointment', success: 'Appointment confirmed.' },
  completed: { title: 'Complete appointment', button: 'Complete and move to History', success: 'Appointment completed and moved to History.' },
  cancelled: { title: 'Cancel appointment', button: 'Cancel appointment', success: 'Appointment cancelled and moved to History.' },
  no_show: { title: 'Mark as no-show', button: 'Mark as no-show', success: 'Marked as no-show and moved to History.' },
}

function StepDialog({ kind, booking: b, userEmail, onClose, onRun }) {
  const requested = b.confirmed_time ? isoToStoreLocal(b.confirmed_time) : { date: b.booking_date, time: (b.booking_time ?? '').slice(0, 5) }
  const [text, setText] = useState('')
  const [date, setDate] = useState(requested.date)
  const [time, setTime] = useState(requested.time)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const copy = DIALOG_COPY[kind]

  async function submit(e) {
    e.preventDefault()
    const note = text.trim()
    let changes
    if (kind === 'no_answer') {
      changes = { call_attempts: (b.call_attempts ?? 0) + 1, call_notes: appendNote(b.call_notes, 'No answer', note, userEmail) }
    } else if (kind === 'called') {
      if (!note) return setError('Write what you discussed with the customer.')
      changes = { status: 'called', called_by: userEmail, call_notes: appendNote(b.call_notes, 'Called', note, userEmail) }
    } else if (kind === 'confirmed') {
      if (!date || !time) return setError('Pick the date and time you agreed on.')
      changes = { status: 'confirmed', confirmed_by: userEmail, confirmed_time: storeLocalToISO(date, time) }
    } else if (kind === 'completed') {
      const value = Number(amount)
      if (amount === '' || !Number.isFinite(value) || value < 0) return setError('Enter the amount paid (0 or more).')
      if (!method) return setError('Choose how the customer paid.')
      changes = {
        status: 'completed', completed_by: userEmail, amount_paid: Math.round(value * 100) / 100, payment_method: method,
        admin_notes: note ? appendNote(b.admin_notes, 'Completed', note, userEmail) : b.admin_notes,
      }
    } else {
      if (!note) return setError('Write a short reason.')
      changes = { status: kind, admin_notes: appendNote(b.admin_notes, STATUS_LABEL[kind], note, userEmail) }
    }
    setBusy(true)
    setError(null)
    const err = await onRun(b, changes, copy.success)
    setBusy(false)
    if (err) setError(err)
  }

  const footer = (
    <>
      <button type="button" className="adm-btn adm-btn-secondary" onClick={onClose} disabled={busy}>Go back</button>
      <button
        type="submit"
        form="appt-step-form"
        className={`adm-btn ${kind === 'cancelled' || kind === 'no_show' ? 'adm-btn-del' : 'adm-btn-primary'}`}
        disabled={busy}
      >
        {busy ? 'Saving…' : copy.button}
      </button>
    </>
  )

  return (
    <AdminModal open title={copy.title} onClose={busy ? undefined : onClose} footer={footer}>
      <form id="appt-step-form" className="adm-form appt-dialog" onSubmit={submit} noValidate>
        <p className="appt-dialog-who">
          <strong>{b.customer_name}</strong> · <a href={telHref(b.customer_phone)}>{b.customer_phone}</a>
          <br />{b.service_name} · requested {fmtRequested(b)}
        </p>

        {error && <div className="adm-form-err">{error}</div>}

        {kind === 'confirmed' && (
          <div className="adm-form-row">
            <div className="adm-field">
              <label htmlFor="appt-date">Date <span className="req">*</span></label>
              <input id="appt-date" type="date" className="adm-input" value={date} min={storeDateStr()} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="appt-time">Time (store time) <span className="req">*</span></label>
              <input id="appt-time" type="time" step="900" className="adm-input" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
        )}

        {kind === 'completed' && (
          <div className="adm-form-row">
            <div className="adm-field">
              <label htmlFor="appt-amount">Amount paid ($) <span className="req">*</span></label>
              <input id="appt-amount" type="number" inputMode="decimal" min="0" step="0.01" className="adm-input" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="appt-method">Payment method <span className="req">*</span></label>
              <select id="appt-method" className="adm-select" value={method} onChange={e => setMethod(e.target.value)}>
                <option value="">Choose…</option>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {kind !== 'confirmed' && (
          <div className="adm-field">
            <label htmlFor="appt-text">
              {kind === 'called' ? <>Call notes <span className="req">*</span></>
                : kind === 'no_answer' ? 'Note (optional), e.g. left voicemail'
                : kind === 'completed' ? 'Note (optional)'
                : <>Reason <span className="req">*</span></>}
            </label>
            <textarea
              id="appt-text"
              className="adm-textarea"
              rows={3}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={kind === 'called' ? 'e.g. Cracked screen on iPhone 13, quoted $129, coming Tuesday at 3' : ''}
            />
          </div>
        )}

        <p className="appt-dialog-hint">
          {kind === 'no_answer' && 'The request stays in Needs action so you can try again.'}
          {kind === 'called' && 'Next step: confirm a date and time.'}
          {kind === 'confirmed' && 'Prefilled with the time the customer asked for. Change it if you agreed on another time.'}
          {kind === 'completed' && 'The appointment moves to History and can’t be reopened.'}
          {(kind === 'cancelled' || kind === 'no_show') && 'The appointment moves to History. It is kept, not deleted.'}
        </p>
      </form>
    </AdminModal>
  )
}

// ── History ──────────────────────────────────────────────────────────────────

function History({ rows }) {
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [open, setOpen] = useState(null)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const needleDigits = digits(q)
    return rows
      .filter(r => {
        const d = appointmentDate(r)
        if (from && d < from) return false
        if (to && d > to) return false
        if (!needle) return true
        return [r.customer_name, r.service_name, r.notes, r.call_notes, r.admin_notes].some(v => v?.toLowerCase().includes(needle))
          || (needleDigits.length >= 3 && digits(r.customer_phone).includes(needleDigits))
      })
      .sort((a, b) => appointmentDate(b).localeCompare(appointmentDate(a)) || (b.archived_at ?? '').localeCompare(a.archived_at ?? ''))
  }, [rows, q, from, to])

  const totals = useMemo(() => {
    const completed = filtered.filter(r => r.status === 'completed')
    return {
      count: filtered.length,
      completed: completed.length,
      paid: completed.reduce((s, r) => s + Number(r.amount_paid ?? 0), 0),
    }
  }, [filtered])

  function exportCSV() {
    const blob = new Blob([toCSV(filtered)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `appointments-${from || 'all'}${to ? `-to-${to}` : ''}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="appt-history">
      <div className="appt-filters adm-table-card">
        <div className="adm-field appt-search">
          <label htmlFor="appt-q">Search</label>
          <input id="appt-q" className="adm-input" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Name, phone, device or issue" />
        </div>
        <div className="adm-field">
          <label htmlFor="appt-from">From</label>
          <input id="appt-from" className="adm-input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="adm-field">
          <label htmlFor="appt-to">To</label>
          <input id="appt-to" className="adm-input" type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      <div className="appt-totals">
        <div className="adm-stat">
          <div>
            <div className="adm-stat-val">{totals.count}</div>
            <div className="adm-stat-lbl">Appointments ({totals.completed} completed)</div>
          </div>
        </div>
        <div className="adm-stat">
          <div>
            <div className="adm-stat-val">{fmtMoney(totals.paid)}</div>
            <div className="adm-stat-lbl">Total paid</div>
          </div>
        </div>
        <button type="button" className="adm-btn adm-btn-secondary appt-export" onClick={exportCSV} disabled={!filtered.length}>
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="adm-table-card"><div className="adm-empty"><div className="adm-empty-title">No appointments match.</div></div></div>
      ) : (
        <ul className="appt-history-list adm-table-card">
          {filtered.map(r => (
            <li key={r.id} className={`appt-hrow${open === r.id ? ' open' : ''}`}>
              <button type="button" className="appt-hrow-btn" aria-expanded={open === r.id} onClick={() => setOpen(o => (o === r.id ? null : r.id))}>
                <span className="appt-hrow-main">
                  <span className="appt-hrow-name">{r.customer_name}</span>
                  <span className="appt-hrow-sub">{r.service_name} · {r.confirmed_time ? fmtStamp(r.confirmed_time) : fmtRequested(r)}</span>
                </span>
                <span className="appt-hrow-side">
                  {r.status === 'completed' && <span className="appt-hrow-amount">{fmtMoney(r.amount_paid)}</span>}
                  <span className={STATUS_BADGE[r.status]}>{STATUS_LABEL[r.status]}</span>
                  <span className="appt-chevron" aria-hidden="true">▾</span>
                </span>
              </button>
              {open === r.id && (
                <div className="appt-hrow-detail">
                  <Details booking={r} full />
                  <Timeline booking={r} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PhoneIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  )
}

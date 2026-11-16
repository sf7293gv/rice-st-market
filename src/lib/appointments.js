// Appointment (bookings table) workflow helpers shared by the admin Appointments page and the
// admin-wide new-appointment alert. Order: new → called → confirmed → completed; cancelled and
// no_show are allowed from any active step. The database enforces the same order (see
// supabase/migrations/20261116000001_bookings_workflow.sql) and stamps who/when for each step.
// All dates are shown and entered in store time (America/Chicago).
import { STORE_TIMEZONE } from './hours'

export const ACTIVE_STATUSES = ['new', 'called', 'confirmed']
export const ARCHIVED_STATUSES = ['completed', 'cancelled', 'no_show']

export const STATUS_LABEL = {
  new: 'New',
  called: 'Called',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
}

export const STATUS_BADGE = {
  new: 'adm-badge adm-badge-red',
  called: 'adm-badge adm-badge-amber',
  confirmed: 'adm-badge adm-badge-green',
  completed: 'adm-badge adm-badge-green',
  cancelled: 'adm-badge adm-badge-gray',
  no_show: 'adm-badge adm-badge-gray',
}

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
]

// ── Store-time conversions ───────────────────────────────────────────────────

function storeParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TIMEZONE, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date)
  return Object.fromEntries(parts.map(p => [p.type, p.value]))
}

// Milliseconds the store's wall clock is ahead of UTC at instant `ts`.
function storeOffsetMs(ts) {
  const p = storeParts(new Date(ts))
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ts / 1000) * 1000
}

// 'YYYY-MM-DD' + 'HH:MM' on the store's clock → ISO timestamp (UTC).
export function storeLocalToISO(dateStr, timeStr) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, mi] = timeStr.split(':').map(Number)
  const wall = Date.UTC(y, mo - 1, d, h, mi)
  let ts = wall - storeOffsetMs(wall)
  ts = wall - storeOffsetMs(ts) // second pass settles DST changeover days
  return new Date(ts).toISOString()
}

// ISO timestamp → { date: 'YYYY-MM-DD', time: 'HH:MM' } on the store's clock.
export function isoToStoreLocal(iso) {
  const p = storeParts(new Date(iso))
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` }
}

// 'Sat, Nov 15, 3:05 PM' in store time.
export function fmtStamp(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', {
    timeZone: STORE_TIMEZONE, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

// Requested slot (date column + time column, already store time) → 'Sat, Nov 15, 3:00 PM'.
export function fmtRequested(b) {
  if (!b.booking_date) return ''
  const [y, mo, d] = b.booking_date.split('-').map(Number)
  const [h, mi] = (b.booking_time ?? '00:00').split(':').map(Number)
  const date = new Date(y, mo - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return `${date}, ${h % 12 || 12}:${String(mi).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// The appointment's date on the store's calendar: the confirmed time if set, else the request.
export function appointmentDate(b) {
  return b.confirmed_time ? isoToStoreLocal(b.confirmed_time).date : b.booking_date
}

export function fmtMoney(n) {
  if (n === null || n === undefined || n === '') return ''
  return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

// ── Notes log ────────────────────────────────────────────────────────────────

// Appends a stamped line ("[Sat, Nov 15, 3:05 PM · admin@x] Called — text") to a notes field.
export function appendNote(existing, label, text, email) {
  const line = `[${fmtStamp(new Date().toISOString())}${email ? ` · ${email}` : ''}] ${label}${text ? ` — ${text}` : ''}`
  return existing ? `${existing}\n${line}` : line
}

// ── Timeline ─────────────────────────────────────────────────────────────────

export function timeline(b) {
  const steps = [{ key: 'requested', label: 'Requested online', at: b.created_at, done: true }]
  if (b.call_attempts > 0) {
    steps.push({ key: 'attempts', label: `${b.call_attempts} unanswered call${b.call_attempts === 1 ? '' : 's'}`, done: true })
  }
  steps.push({ key: 'called', label: 'Customer called', at: b.called_at, by: b.called_by, done: !!b.called_at })
  steps.push({
    key: 'confirmed', label: 'Appointment confirmed', at: b.confirmed_at, by: b.confirmed_by,
    detail: b.confirmed_time ? `For ${fmtStamp(b.confirmed_time)}` : '', done: !!b.confirmed_time,
  })
  if (b.status === 'cancelled' || b.status === 'no_show') {
    steps.push({ key: b.status, label: b.status === 'cancelled' ? 'Cancelled' : 'No-show', at: b.archived_at, done: true, end: 'stop' })
  } else {
    steps.push({
      key: 'completed', label: 'Completed', at: b.completed_at, by: b.completed_by,
      detail: b.completed_at ? `${fmtMoney(b.amount_paid)} · ${PAYMENT_METHODS.find(m => m.value === b.payment_method)?.label ?? b.payment_method}` : '',
      done: !!b.completed_at, end: 'done',
    })
  }
  return steps
}

// ── CSV ──────────────────────────────────────────────────────────────────────

export const CSV_COLUMNS = [
  'id', 'status', 'customer_name', 'customer_phone', 'service_id', 'service_name', 'notes',
  'booking_date', 'booking_time', 'created_at',
  'call_attempts', 'called_at', 'called_by', 'call_notes',
  'confirmed_time', 'confirmed_at', 'confirmed_by',
  'completed_at', 'completed_by', 'amount_paid', 'payment_method',
  'admin_notes', 'archived_at',
]

function csvCell(v) {
  if (v === null || v === undefined) return ''
  const s = String(v)
  // Neutralise spreadsheet formulas in customer-entered text.
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCSV(rows) {
  const lines = [CSV_COLUMNS.join(',')]
  for (const r of rows) lines.push(CSV_COLUMNS.map(c => csvCell(r[c])).join(','))
  return '﻿' + lines.join('\r\n') + '\r\n' // BOM so Excel reads UTF-8
}

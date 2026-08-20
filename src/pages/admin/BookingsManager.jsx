// Bookings manager — read/update/delete repair appointment bookings; supports status changes (pending/confirmed/cancelled).
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import Toast from './Toast'
import ConfirmDialog from './ConfirmDialog'

const STATUS_OPTIONS = ['pending', 'confirmed', 'cancelled']

function fmt12h(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function fmtDate(d) {
  if (!d) return ''
  const [y, mo, day] = d.split('-').map(Number)
  return new Date(y, mo - 1, day).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function BookingsManager() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true })
    if (data) setBookings(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  async function handleStatusChange(id, status) {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) { showToast('Failed to update status', 'error'); return }
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    showToast('Status updated')
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('bookings').delete().eq('id', id)
    if (error) { showToast('Failed to delete booking', 'error'); return }
    setBookings(prev => prev.filter(b => b.id !== id))
    setConfirmDelete(null)
    showToast('Booking deleted')
  }

  const pending   = bookings.filter(b => b.status === 'pending').length
  const confirmed = bookings.filter(b => b.status === 'confirmed').length
  const cancelled = bookings.filter(b => b.status === 'cancelled').length

  return (
    <div>
      <div className="adm-page-header">
        <h1>Repair Bookings</h1>
        <p>Manage customer repair appointments.</p>
      </div>

      <div className="adm-stats">
        <div className="adm-stat">
          <div className="adm-stat-icon amber"><CalendarIcon /></div>
          <div>
            <div className="adm-stat-val">{pending}</div>
            <div className="adm-stat-lbl">Pending</div>
          </div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-icon green"><CheckIcon /></div>
          <div>
            <div className="adm-stat-val">{confirmed}</div>
            <div className="adm-stat-lbl">Confirmed</div>
          </div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-icon red"><XIcon /></div>
          <div>
            <div className="adm-stat-val">{cancelled}</div>
            <div className="adm-stat-lbl">Cancelled</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="adm-loading"><div className="adm-spinner" /><span>Loading bookings…</span></div>
      ) : bookings.length === 0 ? (
        <div className="adm-table-card">
          <div className="adm-empty">
            <div className="adm-empty-icon">📅</div>
            <div className="adm-empty-title">No bookings yet</div>
            <div className="adm-empty-sub">Bookings submitted on the repairs page will appear here.</div>
          </div>
        </div>
      ) : (
        <div className="adm-table-card">
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th>Received</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div className="adm-item-name">{fmtDate(b.booking_date)}</div>
                      <div className="adm-item-sub">{fmt12h(b.booking_time)}</div>
                    </td>
                    <td>
                      <div className="adm-item-name">{b.customer_name}</div>
                      <div className="adm-item-sub">
                        <a href={`tel:${b.customer_phone}`} style={{ color: 'var(--adm-red)' }}>
                          {b.customer_phone}
                        </a>
                      </div>
                    </td>
                    <td>
                      <span className="adm-item-name" style={{ fontWeight: 500 }}>{b.service_name}</span>
                    </td>
                    <td>
                      <span className="adm-item-sub" style={{ maxWidth: 200, display: 'block', whiteSpace: 'normal', lineHeight: 1.4 }}>
                        {b.notes || '—'}
                      </span>
                    </td>
                    <td>
                      <select
                        className="adm-select"
                        value={b.status}
                        onChange={e => handleStatusChange(b.id, e.target.value)}
                        style={{ minWidth: 126, padding: '6px 10px', fontSize: '0.82rem' }}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>
                      {new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td>
                      <div className="adm-actions">
                        <button
                          className="adm-btn adm-btn-danger-ghost"
                          onClick={() => setConfirmDelete(b)}
                          title="Delete booking"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete booking?"
          message={`Remove the booking for ${confirmDelete.customer_name} on ${fmtDate(confirmDelete.booking_date)}? This cannot be undone.`}
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  )
}

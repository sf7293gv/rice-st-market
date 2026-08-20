// Admin dashboard — summary counts for bookings, inquiries, menu items, and specials.
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { STORE_NAME } from '../../lib/siteConfig'

function fmtDate(d) {
  if (!d) return ''
  const [y, mo, day] = d.split('-').map(Number)
  return new Date(y, mo - 1, day).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function fmt12h(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

const STATUS_STYLE = {
  pending:   { cls: 'adm-badge adm-badge-amber', label: 'Pending' },
  confirmed: { cls: 'adm-badge adm-badge-green', label: 'Confirmed' },
  cancelled: { cls: 'adm-badge adm-badge-gray',  label: 'Cancelled' },
}

export default function Dashboard() {
  const [counts, setCounts]   = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const [
        { count: items },
        { count: products },
        { count: services },
        { count: pending },
        { count: specials },
        { count: announcements },
        { count: inquiries },
        { data: recent },
      ] = await Promise.all([
        supabase.from('items').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('active', true),
        supabase.from('repair_services').select('*', { count: 'exact', head: true }).eq('active', true),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('specials').select('*', { count: 'exact', head: true }).eq('active', true),
        supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('active', true),
        supabase.from('inquiries').select('*', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('bookings')
          .select('id, customer_name, service_name, booking_date, booking_time, status')
          .order('created_at', { ascending: false })
          .limit(5),
      ])
      setCounts({
        items:         items         ?? 0,
        products:      products      ?? 0,
        services:      services      ?? 0,
        pending:       pending       ?? 0,
        specials:      specials      ?? 0,
        announcements: announcements ?? 0,
        inquiries:     inquiries     ?? 0,
      })
      setBookings(recent ?? [])
      setLoading(false)
    }
    fetch()
  }, [])

  const v = (key) => loading ? '—' : counts?.[key] ?? 0

  return (
    <div>
      <div className="adm-page-header">
        <h1>Dashboard</h1>
        <p>Welcome back — here's what's happening at {STORE_NAME}.</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="adm-stats dash-stats">

        <div className="adm-stat">
          <div className="adm-stat-icon red"><MenuIcon /></div>
          <div>
            <div className="adm-stat-val">{v('items')}</div>
            <div className="adm-stat-lbl">Menu Items</div>
          </div>
        </div>

        <div className="adm-stat">
          <div className="adm-stat-icon amber"><ShopIcon /></div>
          <div>
            <div className="adm-stat-val">{v('products')}</div>
            <div className="adm-stat-lbl">Electronics</div>
          </div>
        </div>

        <div className="adm-stat">
          <div className="adm-stat-icon red"><WrenchIcon /></div>
          <div>
            <div className="adm-stat-val">{v('services')}</div>
            <div className="adm-stat-lbl">Repair Services</div>
          </div>
        </div>

        <div className={`adm-stat${!loading && counts?.pending > 0 ? ' dash-stat-alert' : ''}`}>
          <div className={`adm-stat-icon ${!loading && counts?.pending > 0 ? 'red' : 'amber'}`}>
            <CalendarIcon />
          </div>
          <div>
            <div className="adm-stat-val">{v('pending')}</div>
            <div className="adm-stat-lbl">
              Pending Bookings
              {!loading && counts?.pending > 0 && (
                <span className="dash-alert-dot" aria-label="Needs attention" />
              )}
            </div>
          </div>
        </div>

        <div className="adm-stat">
          <div className="adm-stat-icon green"><TagIcon /></div>
          <div>
            <div className="adm-stat-val">{v('specials')}</div>
            <div className="adm-stat-lbl">Active Specials</div>
          </div>
        </div>

        <div className="adm-stat">
          <div className="adm-stat-icon green"><BellIcon /></div>
          <div>
            <div className="adm-stat-val">{v('announcements')}</div>
            <div className="adm-stat-lbl">Live Announcements</div>
          </div>
        </div>

        <div className={`adm-stat${!loading && counts?.inquiries > 0 ? ' dash-stat-alert' : ''}`}>
          <div className={`adm-stat-icon ${!loading && counts?.inquiries > 0 ? 'red' : 'amber'}`}>
            <InboxIcon />
          </div>
          <div>
            <div className="adm-stat-val">{v('inquiries')}</div>
            <div className="adm-stat-lbl">
              New Inquiries
              {!loading && counts?.inquiries > 0 && (
                <span className="dash-alert-dot" aria-label="Needs attention" />
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Lower section ── */}
      <div className="dash-lower">

        {/* Recent bookings */}
        <div className="adm-panel dash-bookings-panel">
          <div className="dash-panel-hd">
            <span>Recent Bookings</span>
            <Link to="/admin/bookings" className="dash-view-all">
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="adm-loading" style={{ padding: '32px 0' }}>
              <div className="adm-spinner" />
              <span>Loading…</span>
            </div>
          ) : bookings.length === 0 ? (
            <div className="dash-empty">
              <CalendarIcon />
              <p>No bookings yet</p>
            </div>
          ) : (
            <div className="dash-booking-list">
              {bookings.map(b => {
                const st = STATUS_STYLE[b.status] ?? STATUS_STYLE.pending
                return (
                  <div key={b.id} className="dash-booking-row">
                    <div className="dash-booking-main">
                      <span className="dash-booking-name">{b.customer_name}</span>
                      <span className="dash-booking-svc">{b.service_name}</span>
                    </div>
                    <div className="dash-booking-meta">
                      <span className="dash-booking-time">
                        {fmtDate(b.booking_date)} · {fmt12h(b.booking_time)}
                      </span>
                      <span className={st.cls}>{st.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="adm-panel">
          <div className="dash-panel-hd">
            <span>Quick Actions</span>
          </div>
          <div className="dash-shortcuts-list">
            <Link to="/admin/items" className="adm-shortcut">
              <PlusIcon />
              Add Menu Item
            </Link>
            <Link to="/admin/shop" className="adm-shortcut">
              <PlusIcon />
              Add Shop Product
            </Link>
            <Link to="/admin/bookings" className="adm-shortcut">
              <CalendarIcon />
              View Bookings
            </Link>
            <Link to="/admin/specials" className="adm-shortcut">
              <TagIcon />
              Manage Specials
            </Link>
            <Link to="/admin/announcements" className="adm-shortcut">
              <BellIcon />
              Post Announcement
            </Link>
            <Link to="/admin/hours" className="adm-shortcut">
              <ClockIcon />
              Edit Hours
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}

/* ── Icons ─────────────────────────────────────────────────── */
function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )
}
function ShopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  )
}
function WrenchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
    </svg>
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
function TagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  )
}
function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
function InboxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
    </svg>
  )
}

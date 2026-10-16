// Admin shell — responsive sidebar navigation, mobile hamburger overlay, and top bar with logged-in user.
// Sidebar closes automatically on route change (mobile UX).
import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { SHOW_TOBACCO_PAGE, STORE_NAME_SHORT, STORE_INITIALS } from '../../lib/siteConfig'
import '../../styles/admin.css'

const NAV = [
  {
    label: 'Overview',
    links: [
      { to: '/admin', label: 'Dashboard', end: true, icon: <DashIcon /> },
    ],
  },
  {
    label: 'Content',
    links: [
      { to: '/admin/items',         label: 'Menu Items',     icon: <ItemsIcon /> },
      { to: '/admin/specials',      label: 'Weekly Specials',icon: <SpecialsIcon /> },
      { to: '/admin/announcements', label: 'Announcements',  icon: <BellIcon /> },
      { to: '/admin/hours',         label: 'Store Hours',    icon: <ClockIcon /> },
    ],
  },
  {
    label: 'Electronics',
    links: [
      { to: '/admin/electronics', label: 'Electronics', icon: <ShopIcon /> },
      { to: '/admin/plans',       label: 'Plans',        icon: <SignalIcon /> },
      { to: '/admin/carriers',    label: 'Carriers',     icon: <TowerIcon /> },
      { to: '/admin/inquiries',   label: 'Inquiries',   icon: <InboxIcon /> },
    ],
  },
  ...(SHOW_TOBACCO_PAGE ? [{
    label: 'Tobacco',
    links: [
      { to: '/admin/tobacco', label: 'Tobacco', icon: <TobaccoIcon /> },
    ],
  }] : []),
  {
    label: 'Repairs',
    links: [
      { to: '/admin/repairs',       label: 'Repair Services', icon: <WrenchIcon /> },
      { to: '/admin/repair-media',  label: 'Repair Media',    icon: <PhotoIcon /> },
      { to: '/admin/bookings',      label: 'Bookings',        icon: <CalendarIcon /> },
    ],
  },
  {
    label: 'Account',
    links: [
      { to: '/admin/settings', label: 'Settings', icon: <GearIcon /> },
    ],
  },
]

const PAGE_TITLES = {
  '/admin':                'Dashboard',
  '/admin/items':          'Menu Items',
  '/admin/specials':       'Weekly Specials',
  '/admin/announcements':  'Announcements',
  '/admin/hours':          'Store Hours',
  '/admin/electronics':    'Electronics',
  '/admin/plans':          'Plans',
  '/admin/carriers':       'Carriers',
  '/admin/inquiries':      'Inquiries',
  '/admin/tobacco':        'Tobacco',
  '/admin/repairs':        'Repair Services',
  '/admin/repair-media':   'Repair Media',
  '/admin/bookings':       'Bookings',
  '/admin/settings':       'Settings',
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [session, setSession] = useState(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login', { replace: true })
  }

  const userEmail = session?.user?.email ?? ''
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : STORE_INITIALS.slice(0, 2)
  const pageTitle = PAGE_TITLES[pathname] ?? 'Admin'

  return (
    <div className="admin-shell">

      {/* Sidebar */}
      <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="adm-brand">
          <div className="adm-brand-icon">{STORE_INITIALS}</div>
          <div className="adm-brand-text">
            <div className="adm-brand-name">{STORE_NAME_SHORT}</div>
            <div className="adm-brand-sub">Admin Panel</div>
          </div>
        </div>

        <nav className="adm-nav" aria-label="Admin navigation">
          {NAV.map(section => (
            <div key={section.label}>
              <div className="adm-nav-section-label">{section.label}</div>
              {section.links.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => `adm-nav-link${isActive ? ' active' : ''}`}
                >
                  {link.icon}
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="adm-sidebar-footer">
          <button className="adm-logout-btn" onClick={handleLogout}>
            <LogoutIcon />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay (mobile) */}
      {sidebarOpen && (
        <div className="adm-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* Main */}
      <div className="admin-main">
        <header className="adm-topbar">
          <button
            className="adm-topbar-menu"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle navigation"
          >
            <MenuIcon />
          </button>

          <span className="adm-page-title">{pageTitle}</span>
          <div className="adm-topbar-spacer" />

          <div className="adm-topbar-user">
            <span className="adm-user-email">{userEmail}</span>
            <div className="adm-user-avatar" aria-hidden="true">{initials}</div>
          </div>
        </header>

        <div className="adm-content">
          <Outlet />
        </div>
      </div>

    </div>
  )
}

/* ── Icons ─────────────────────────────────────────────────── */
function DashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  )
}

function ItemsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )
}

function SpecialsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

function ShopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  )
}

function SignalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="2" y1="20" x2="2" y2="20"/>
      <line x1="6" y1="16" x2="6" y2="20"/>
      <line x1="10" y1="12" x2="10" y2="20"/>
      <line x1="14" y1="8" x2="14" y2="20"/>
      <line x1="18" y1="4" x2="18" y2="20"/>
    </svg>
  )
}

function TowerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5a7 7 0 010-9"/>
      <path d="M19 3.5a7 7 0 010 9"/>
      <path d="M8.5 10a3 3 0 010-4"/>
      <path d="M15.5 6a3 3 0 010 4"/>
      <circle cx="12" cy="8" r="1"/>
      <line x1="12" y1="9" x2="8" y2="21"/>
      <line x1="12" y1="9" x2="16" y2="21"/>
      <line x1="9.3" y1="17" x2="14.7" y2="17"/>
    </svg>
  )
}

function WrenchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function PhotoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

function TobaccoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  )
}

function InboxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}

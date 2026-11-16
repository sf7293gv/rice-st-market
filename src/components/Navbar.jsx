// Responsive top navigation — scrolled glass effect, mobile hamburger with overlay.
// "Book Appointment" (the site's primary call to action) is the first item: an orange button on
// desktop, the top of the slide-out menu on mobile, plus a persistent "Book Now" button in the
// mobile header bar next to the menu icon.
import { useState, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { SHOW_TOBACCO_PAGE } from '../lib/siteConfig'
import BookLink from './BookLink'
import './Navbar.css'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/repairs', label: 'Repairs' },
  { to: '/electronics', label: 'Electronics' },
  { to: '/accessories', label: 'Accessories' },
  { to: '/plans', label: 'Plans' },
  ...(SHOW_TOBACCO_PAGE ? [{ to: '/tobacco', label: 'Tobacco' }] : []),
  { to: '/grocery', label: 'Grocery' },
  { to: '/deli', label: 'Deli' },
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const close = () => setOpen(false)

  return (
    <nav className={`navbar${scrolled ? ' scrolled' : ''}`} role="navigation" aria-label="Main navigation">
      <div className="navbar-inner container">
        <Link to="/" className="navbar-logo" onClick={close}>
          <span className="logo-unity">Rice St</span>
          <span className="logo-foods">Market</span>
        </Link>

        <ul className={`navbar-links${open ? ' open' : ''}`}>
          <li className="nav-book-item">
            <BookLink className="btn-book nav-book-btn" onClick={close}>
              <CalendarIcon />
              Book Appointment
            </BookLink>
          </li>
          {NAV_LINKS.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) => isActive ? 'active' : undefined}
                onClick={close}
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <BookLink className="btn-book nav-book-mobile" onClick={close}>
          Book<span className="nav-book-now"> Now</span>
        </BookLink>

        <button
          className={`hamburger${open ? ' open' : ''}`}
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {open && <div className="nav-overlay" onClick={close} aria-hidden="true" />}
    </nav>
  )
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

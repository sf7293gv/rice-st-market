// Responsive top navigation — scrolled glass effect, mobile hamburger with overlay.
import { useState, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { SHOW_TOBACCO_PAGE } from '../lib/siteConfig'
import './Navbar.css'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/repairs', label: 'Repairs' },
  { to: '/electronics', label: 'Electronics' },
  { to: '/accessories', label: 'Accessories' },
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

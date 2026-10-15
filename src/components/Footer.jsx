// Site footer — fetches social media URLs from the settings table and store hours from the hours table,
// so the admin can update both without a redeploy.
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { STORE_NAME, STORE_ADDRESS, STORE_PHONE, STORE_PHONE_TEL, STORE_PHONE_2, STORE_PHONE_2_TEL } from '../lib/siteConfig'
import { DEFAULT_OPEN, DEFAULT_CLOSE, fmtTime } from '../lib/hours'
import './Footer.css'

const NAV_LINKS = [
  { to: '/',            label: 'Home' },
  { to: '/repairs',     label: 'Repairs' },
  { to: '/electronics', label: 'Electronics' },
  { to: '/menu',        label: 'Menu' },
  { to: '/services',    label: 'Services' },
  { to: '/about',       label: 'About' },
  { to: '/contact',     label: 'Contact' },
]

export default function Footer() {
  const year = new Date().getFullYear()
  const [social, setSocial] = useState({ facebook: '', instagram: '', tiktok: '' })
  const [hours, setHours] = useState([])

  useEffect(() => {
    supabase
      .from('settings')
      .select('key, value')
      .in('key', ['facebook_url', 'instagram_url', 'tiktok_url'])
      .then(({ data }) => {
        if (!data) return
        const get = (k) => data.find(r => r.key === k)?.value?.trim() ?? ''
        setSocial({
          facebook:  get('facebook_url'),
          instagram: get('instagram_url'),
          tiktok:    get('tiktok_url'),
        })
      })
    supabase.from('hours').select('*').then(({ data }) => {
      if (data) setHours(data)
    })
  }, [])

  // Same open/close every day → show one range; otherwise point to the full schedule.
  const openRows = hours.filter(h => !h.is_closed)
  const allSame = hours.length === 7 && openRows.length === 7
    && openRows.every(h => h.open_time === openRows[0].open_time && h.close_time === openRows[0].close_time)
  const hoursLabel = hours.length === 0
    ? `${fmtTime(DEFAULT_OPEN)} – ${fmtTime(DEFAULT_CLOSE)}`
    : allSame ? `${fmtTime(openRows[0].open_time)} – ${fmtTime(openRows[0].close_time)}` : null

  const hasSocial = social.facebook || social.instagram || social.tiktok

  return (
    <footer className="footer">
      <div className="footer-inner container">
        <div className="footer-grid">

          {/* ── Brand ── */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <span>Rice St</span><span className="logo-red">Market</span>
            </Link>
            <p className="footer-tagline">
              Your neighborhood store on Rice Street — serving the North End
              of St. Paul with fresh food, groceries, and essential services.
            </p>
            {hasSocial && (
              <div className="footer-social" aria-label="Social media">
                {social.facebook && (
                  <a
                    href={social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-social-link"
                    aria-label="Facebook"
                  >
                    <FacebookIcon />
                  </a>
                )}
                {social.instagram && (
                  <a
                    href={social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-social-link"
                    aria-label="Instagram"
                  >
                    <InstagramIcon />
                  </a>
                )}
                {social.tiktok && (
                  <a
                    href={social.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-social-link"
                    aria-label="TikTok"
                  >
                    <TikTokIcon />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ── Visit Us ── */}
          <div className="footer-col">
            <h3>Visit Us</h3>
            <ul>
              <li>
                <PinIcon />
                <span>{STORE_ADDRESS}</span>
              </li>
              <li>
                <PhoneIcon />
                <span>
                  <a href={STORE_PHONE_TEL}>{STORE_PHONE}</a>
                  {' · '}
                  <a href={STORE_PHONE_2_TEL}>{STORE_PHONE_2}</a>
                </span>
              </li>
            </ul>
          </div>

          {/* ── Hours ── */}
          <div className="footer-col">
            <h3>Hours</h3>
            <ul>
              <li>
                <ClockIcon />
                {hoursLabel
                  ? <span>Open Every Day<br /><strong>{hoursLabel}</strong></span>
                  : <span>Hours vary by day<br /><Link to="/contact">See full schedule</Link></span>}
              </li>
            </ul>
          </div>

          {/* ── Navigate ── */}
          <div className="footer-col">
            <h3>Navigate</h3>
            <ul className="footer-nav">
              {NAV_LINKS.map(({ to, label }) => (
                <li key={to}><Link to={to}>{label}</Link></li>
              ))}
            </ul>
          </div>

        </div>

        <div className="footer-bottom">
          <p>© {year} {STORE_NAME}. All rights reserved.</p>
          <p className="footer-location">Rice Street · North End · St. Paul, MN</p>
        </div>
      </div>
    </footer>
  )
}

/* ── Icons ────────────────────────────────────────────────── */
function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.69 12 19.79 19.79 0 011.62 3.38 2 2 0 013.6 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

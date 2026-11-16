// Always-available booking actions on public pages:
//  • Mobile (≤768px): a bottom bar with "Book Appointment" and "Call Now". The footer gets matching
//    bottom padding so nothing ends up hidden behind it.
//  • Desktop: a floating "Book Appointment" pill at the bottom right, shown once the page's first
//    section (the hero) has scrolled out of view.
// Both hide while the booking form is on screen, and whenever they would sit on top of the
// "See Rice St Market" video player or the footer (the WhatsApp / back-to-top buttons also hide
// while they'd cover the player). Rendered in the pre-rendered HTML (bar visible,
// pill hidden) so the text is there before hydration; both are position: fixed, so they never shift
// layout. Not used on /admin (AdminLayout doesn't render it; the pathname check is a safety net).
import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import BookLink from './BookLink'
import { STORE_PHONE_TEL } from '../lib/siteConfig'
import './BookingCTAs.css'

const overlapsY = (r, top, bottom) => !!r && r.top < bottom && r.bottom > top
const overlaps = (r, box) => overlapsY(r, box.top, box.bottom) && r.left < box.right && r.right > box.left

export default function BookingCTAs() {
  const { pathname } = useLocation()
  const [barHidden, setBarHidden] = useState(false)
  const [pillShown, setPillShown] = useState(false)
  const barRef = useRef(null)
  const pillRef = useRef(null)

  useEffect(() => {
    let raf = 0
    function update() {
      raf = 0
      const vh = window.innerHeight
      const rect = sel => document.querySelector(sel)?.getBoundingClientRect()
      const form = rect('#booking')
      const video = rect('.featured-video-frame')
      const footer = rect('.footer')
      const formOnScreen = overlapsY(form, 0, vh)

      // Bottom bar: the strip it covers at the bottom of the viewport.
      const barH = barRef.current?.offsetHeight || 0
      const barTop = vh - barH
      const barBlocked = formOnScreen || overlapsY(video, barTop, vh) || overlapsY(footer, barTop, vh)
      setBarHidden(barBlocked)

      // Pill: after the first section, and not on top of the video, form or footer.
      const hero = document.querySelector('main section')?.getBoundingClientRect()
      const pastHero = !hero || hero.bottom <= 0
      const p = pillRef.current?.getBoundingClientRect()
      const box = p ? { top: p.top - 12, bottom: p.bottom + 12, left: p.left - 12, right: p.right + 12 } : null
      const pillBlocked = formOnScreen || (box && (overlaps(video, box) || overlapsY(footer, box.top, box.bottom)))
      setPillShown(pastHero && !pillBlocked)

      // The WhatsApp / back-to-top buttons also step aside while they'd cover the video player.
      const floaters = ['.wa-float', '.btt-btn'].map(rect).filter(Boolean)
      const overVideo = !!video && floaters.some(f => overlaps(video, { top: f.top - 8, bottom: f.bottom + 8, left: f.left - 8, right: f.right + 8 }))
      document.documentElement.classList.toggle('floating-over-video', overVideo)
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update) }
    schedule()
    // Content above can grow after data loads (e.g. the featured video appears), so re-check a bit later too.
    const late = setTimeout(schedule, 1500)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(late)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      document.documentElement.classList.remove('floating-over-video')
    }
  }, [pathname])

  if (pathname.startsWith('/admin')) return null

  return (
    <>
      <div
        ref={barRef}
        className={`mobile-cta-bar${barHidden ? ' is-hidden' : ''}`}
        role="region"
        aria-label="Book or call"
      >
        <BookLink className="mobile-cta-book btn-book-focus">
          <CalendarIcon />
          Book Appointment
        </BookLink>
        <a href={STORE_PHONE_TEL} className="mobile-cta-call btn-book-focus">
          <PhoneIcon />
          Call Now
        </a>
      </div>

      <BookLink
        ref={pillRef}
        className={`btn-book booking-pill${pillShown ? ' is-shown' : ''}`}
        tabIndex={pillShown ? undefined : -1}
        aria-hidden={pillShown ? undefined : true}
      >
        <CalendarIcon />
        Book Appointment
      </BookLink>
    </>
  )
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  )
}

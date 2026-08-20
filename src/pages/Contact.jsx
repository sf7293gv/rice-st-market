// Contact page — displays address, phone, and live store hours fetched from Supabase,
// plus an embedded Google Maps iframe.
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useFadeIn } from '../hooks/useScrollAnimation'
import { Helmet } from 'react-helmet-async'
import { STORE_NAME, STORE_ADDRESS, STORE_PHONE, STORE_PHONE_TEL } from '../lib/siteConfig'
import './Contact.css'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function Contact() {
  const [hours, setHours] = useState([])

  const headerRef = useFadeIn()
  const infoRef = useFadeIn()
  const mapRef = useFadeIn()

  useEffect(() => {
    supabase.from('hours').select('*').order('id').then(({ data }) => {
      if (data) setHours(data)
    })
  }, [])

  const orderedHours = DAYS.map(d => hours.find(h => h.day === d)).filter(Boolean)
  const allSame = orderedHours.length === 7
    && orderedHours.every(h => !h.is_closed)
    && orderedHours.every(h => h.open_time === orderedHours[0].open_time && h.close_time === orderedHours[0].close_time)

  return (
    <div className="contact-page">
      <Helmet>
        <title>Contact — {STORE_NAME} | St. Paul, MN</title>
        <meta name="description" content={`Contact ${STORE_NAME} — located at ${STORE_ADDRESS}. Call, visit, or send a message.`} />
        <meta property="og:title" content={`Contact — ${STORE_NAME} | St. Paul, MN`} />
        <meta property="og:description" content={`Contact ${STORE_NAME} — located at ${STORE_ADDRESS}. Call, visit, or send a message.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://unity-foods.vercel.app/contact" />
      </Helmet>

      {/* ── Header ── */}
      <div className="contact-header">
        <div className="container">
          <div className="fade-up" ref={headerRef}>
            <span className="section-eyebrow" style={{ color: 'rgba(255,255,255,0.5)' }}>Come Visit</span>
            <h1 className="contact-title">Find Us</h1>
            <p className="contact-subtitle">
              We're open every day. Stop by, give us a call, or use the map to find us on Rice Street.
            </p>
          </div>
        </div>
      </div>

      {/* ── Info + Map ── */}
      <section className="section">
        <div className="container">
          <div className="contact-layout">

            {/* Info panel */}
            <div className="contact-info fade-up" ref={infoRef}>

              <div className="contact-card">
                <div className="contact-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div>
                  <h3>Address</h3>
                  <p>{STORE_ADDRESS}</p>
                  <p className="contact-neighborhood">Rice Street · North End</p>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(STORE_ADDRESS)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-link"
                  >
                    Open in Google Maps →
                  </a>
                </div>
              </div>

              <div className="contact-card">
                <div className="contact-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <h3>Hours</h3>
                  {orderedHours.length === 0 ? (
                    <>
                      <div className="hours-table">
                        <span>Every Day</span>
                        <span className="hours-time">8:00 AM – 10:00 PM</span>
                      </div>
                      <p className="hours-note">Open 365 days a year</p>
                    </>
                  ) : allSame ? (
                    <>
                      <div className="hours-table">
                        <span>Every Day</span>
                        <span className="hours-time">
                          {fmtTime(orderedHours[0].open_time)} – {fmtTime(orderedHours[0].close_time)}
                        </span>
                      </div>
                      <p className="hours-note">Open 365 days a year</p>
                    </>
                  ) : (
                    orderedHours.map(h => (
                      <div key={h.day} className="hours-table">
                        <span>{h.day.slice(0, 3)}</span>
                        {h.is_closed
                          ? <span className="hours-closed-text">Closed</span>
                          : <span className="hours-time">{fmtTime(h.open_time)} – {fmtTime(h.close_time)}</span>
                        }
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="contact-card">
                <div className="contact-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.69 12 19.79 19.79 0 011.62 3.38 2 2 0 013.6 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                </div>
                <div>
                  <h3>Phone</h3>
                  <a href={STORE_PHONE_TEL} className="contact-phone">{STORE_PHONE}</a>
                  <p>Call us anytime during store hours</p>
                </div>
              </div>

            </div>

            {/* Map */}
            <div className="contact-map fade-up" ref={mapRef}>
              <div className="map-wrapper">
                <iframe
                  title={`${STORE_NAME} Location Map`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(STORE_ADDRESS)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className="map-footer">
                <span>{STORE_ADDRESS}</span>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(STORE_ADDRESS)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline"
                  style={{ padding: '9px 20px', fontSize: '0.875rem' }}
                >
                  Get Directions
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  )
}

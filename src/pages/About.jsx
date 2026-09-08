// About page — static brand story content plus live store hours fetched from Supabase.
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useFadeIn } from '../hooks/useScrollAnimation'
import { Helmet } from 'react-helmet-async'
import { STORE_NAME, STORE_PHONE, STORE_PHONE_TEL, STORE_PHONE_2, STORE_PHONE_2_TEL } from '../lib/siteConfig'
import './About.css'

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

function shortTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return m === 0 ? `${hour}${ampm}` : `${hour}:${String(m).padStart(2, '0')}${ampm}`
}

const VALUES = [
  {
    icon: '🤝',
    title: 'Community First',
    description: 'We exist to serve our neighbors. Every decision we make starts with what\'s best for the people of the North End.',
  },
  {
    icon: '💰',
    title: 'Fair Prices',
    description: 'Quality food and services shouldn\'t be a luxury. We keep our prices honest and accessible for everyone.',
  },
  {
    icon: '😊',
    title: 'Warm Service',
    description: 'When you walk through our door, you\'re not a customer — you\'re a neighbor. We treat everyone with dignity and care.',
  },
  {
    icon: '✅',
    title: 'Quality Products',
    description: 'We stock what our community actually needs and wants — fresh, reliable, and always worth it.',
  },
]

export default function About() {
  const [hours, setHours] = useState([])

  useEffect(() => {
    supabase.from('hours').select('*').order('id').then(({ data }) => {
      if (data) setHours(data)
    })
  }, [])

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const orderedHours = DAYS_ORDER.map(d => hours.find(h => h.day === d)).filter(Boolean)
  const displayHours = orderedHours.length === 7
    ? orderedHours
    : DAYS_ORDER.map(d => ({ day: d, open_time: '08:00', close_time: '22:00', is_closed: false }))
  const todayRow = orderedHours.find(h => h.day === todayName)

  const heroRef = useFadeIn()
  const storyRef = useFadeIn()
  const valuesHeaderRef = useFadeIn()
  const valuesGridRef = useFadeIn()
  const hoursRef = useFadeIn()
  const visitRef = useFadeIn()

  return (
    <div className="about-page">
      <Helmet>
        <title>About Us — {STORE_NAME} | St. Paul, MN</title>
        <meta name="description" content={`Learn about ${STORE_NAME} — a community store in St. Paul, MN.`} />
        <meta property="og:title" content={`About Us — ${STORE_NAME} | St. Paul, MN`} />
        <meta property="og:description" content={`Learn about ${STORE_NAME} — a community store in St. Paul, MN.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://unity-foods.vercel.app/about" />
      </Helmet>

      {/* ── Hero ── */}
      <div className="about-hero">
        <div className="container">
          <div className="fade-up" ref={heroRef}>
            <span className="section-eyebrow" style={{ color: 'rgba(255,255,255,0.5)' }}>Who We Are</span>
            <h1 className="about-hero-title">Our Story</h1>
            <p className="about-hero-subtitle">
              A neighborhood store rooted in community, built on trust, and open every day for the people of St. Paul's North End.
            </p>
          </div>
        </div>
      </div>

      {/* ── Story ── */}
      <section className="section">
        <div className="container">
          <div className="story-layout fade-up" ref={storyRef}>
            <div className="story-text">
              <span className="section-eyebrow">Since the Beginning</span>
              <h2 className="section-title">Built for This Neighborhood</h2>
              <p>
                {STORE_NAME} was founded with a clear purpose: to be the kind of store this neighborhood deserves. Located on Rice Street in St. Paul's North End, we offer a thoughtfully curated mix of fresh deli items, everyday groceries, beverages, snacks, and essential services.
              </p>
              <p>
                We believe in treating every person who walks through our door with respect and warmth. Whether you're grabbing a quick bite, stocking up on essentials, getting your phone fixed, or duplicating a key — we're here to make it easy.
              </p>
              <p>
                The store is more than a business. It's a gathering point, a resource, and a constant in a neighborhood that has seen a great deal of change. We're honored to be part of this community's daily life.
              </p>
            </div>
            <div className="story-aside">
              <div className="story-card">
                <div className="story-stat">
                  <span className="story-number">
                    {todayRow && !todayRow.is_closed ? shortTime(todayRow.open_time) : '8AM'}
                  </span>
                  <span className="story-label">Open every morning</span>
                </div>
              </div>
              <div className="story-card accent">
                <div className="story-stat">
                  <span className="story-number">
                    {todayRow && !todayRow.is_closed ? shortTime(todayRow.close_time) : '10PM'}
                  </span>
                  <span className="story-label">Close every night</span>
                </div>
              </div>
              <div className="story-card dark">
                <div className="story-stat">
                  <span className="story-number">7</span>
                  <span className="story-label">Days a week, always here</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="section">
        <div className="container">
          <div className="section-header centered fade-up" ref={valuesHeaderRef}>
            <span className="section-eyebrow">What We Believe</span>
            <h2 className="section-title">Our Values</h2>
            <p className="section-subtitle">
              These aren't just words on a wall — they guide every interaction we have with our community.
            </p>
          </div>
          <div className="values-grid stagger-grid fade-up" ref={valuesGridRef}>
            {VALUES.map(value => (
              <div key={value.title} className="value-card">
                <span className="value-icon" aria-hidden="true">{value.icon}</span>
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Store Hours ── */}
      <section className="section about-hours-section">
        <div className="container">
          <div className="about-hours-inner fade-up" ref={hoursRef}>

            <div className="about-hours-header">
              <span className="section-eyebrow">We're Open</span>
              <h2 className="section-title">Store Hours</h2>
              <p>
                We're here for you every day of the week — mornings, evenings, and everything in between.
                Stop by anytime during our hours or give us a call.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '24px' }}>
                <a href={STORE_PHONE_TEL} className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.69 12 19.79 19.79 0 011.62 3.38 2 2 0 013.6 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                  {STORE_PHONE}
                </a>
                <a href={STORE_PHONE_2_TEL} className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.69 12 19.79 19.79 0 011.62 3.38 2 2 0 013.6 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                  {STORE_PHONE_2}
                </a>
              </div>
            </div>

            <div className="about-hours-schedule">
              {displayHours.map(h => (
                <div
                  key={h.day}
                  className={`about-hours-row${h.day === todayName ? ' today' : ''}`}
                >
                  <span className="about-hours-dayname">
                    {h.day}
                    {h.day === todayName && <span className="about-today-tag">Today</span>}
                  </span>
                  {h.is_closed
                    ? <span className="about-hours-closed">Closed</span>
                    : <span className="about-hours-time">{fmtTime(h.open_time)} – {fmtTime(h.close_time)}</span>
                  }
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Visit ── */}
      <section className="section section-alt">
        <div className="container">
          <div className="about-visit fade-up" ref={visitRef}>
            <div>
              <span className="section-eyebrow">Come See Us</span>
              <h2 className="section-title">Visit {STORE_NAME}</h2>
              <p className="section-subtitle">We're open every single day. Come in, say hi, and let us take care of you.</p>
            </div>
            <div className="about-visit-actions">
              <Link to="/contact" className="btn-primary">Get Directions</Link>
              <Link to="/menu" className="btn-outline">Browse Our Menu</Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

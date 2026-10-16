// Repairs page — lists active repair services, a before/after media gallery, and a booking form.
// Time slots run from the day's open_time to 15 min before close_time (hours table), in 15-min
// intervals; closed days return no slots, and slots already past are hidden for today.
// "Today" uses the store's timezone (America/Chicago).
// The #booking hash scrolls to the form with an 80ms delay so Layout's scroll-to-top resolves first.
import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useFadeIn } from '../hooks/useScrollAnimation'
import { Helmet } from 'react-helmet-async'
import { STORE_NAME, STORE_ADDRESS, STORE_PHONE, STORE_PHONE_TEL, STORE_PHONE_2, STORE_PHONE_2_TEL, SITE_URL } from '../lib/siteConfig'
import { storeDateStr, storeNowMins, toMins } from '../lib/hours'
import { useHydrated } from '../hooks/useHydrated'
import './Repairs.css'

const JS_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function fmt12h(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function daysFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

function getTimeSlotsForDate(dateStr, hours) {
  if (!dateStr || !hours.length) return []
  const [y, mo, d] = dateStr.split('-').map(Number)
  const dayName = JS_DAY_NAMES[new Date(y, mo - 1, d).getDay()]
  const dayRow = hours.find(h => h.day === dayName)
  if (!dayRow || dayRow.is_closed) return []
  const earliest = dateStr === storeDateStr() ? storeNowMins() + 1 : 0
  const slots = []
  for (let mins = Math.max(toMins(dayRow.open_time), Math.ceil(earliest / 15) * 15); mins <= toMins(dayRow.close_time) - 15; mins += 15) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  return slots
}

export default function Repairs() {
  const { hash } = useLocation()
  const [services, setServices] = useState([])
  const [media, setMedia] = useState([])
  const [hours, setHours] = useState([])
  const [ownerPhone, setOwnerPhone] = useState('')
  const [lightbox, setLightbox] = useState(null)

  // Scroll to booking form when linked with #booking hash
  useEffect(() => {
    if (hash !== '#booking') return
    const t = setTimeout(() => {
      document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    return () => clearTimeout(t)
  }, [hash])

  const heroRef          = useFadeIn()
  const servicesHeaderRef = useFadeIn()
  const servicesEmptyRef  = useFadeIn()
  const mediaHeaderRef   = useFadeIn()
  const mediaGridRef     = useFadeIn()
  const bookHeaderRef    = useFadeIn()
  const ctaRef           = useFadeIn()

  useEffect(() => {
    async function fetchData() {
      const [
        { data: svc, error: svcErr },
        { data: med },
        { data: hoursData },
        { data: settingsData },
      ] = await Promise.all([
        supabase.from('repair_services').select('*').eq('active', true).order('created_at'),
        supabase.from('repair_media').select('*').order('created_at', { ascending: false }),
        supabase.from('hours').select('*'),
        supabase.from('settings').select('key, value').in('key', ['owner_phone']),
      ])
      if (svcErr) console.error('repair_services fetch error:', svcErr)
      if (svc) setServices(svc)
      if (med) setMedia(med)
      if (hoursData) setHours(hoursData)
      if (settingsData) {
        const row = settingsData.find(r => r.key === 'owner_phone')
        if (row?.value) setOwnerPhone(row.value)
      }
    }
    fetchData()
  }, [])

  const photos = media.filter(m => m.type === 'photo')

  useEffect(() => {
    if (lightbox === null) return
    function onKey(e) {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowRight') setLightbox(i => (i + 1) % photos.length)
      if (e.key === 'ArrowLeft')  setLightbox(i => (i - 1 + photos.length) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [lightbox, photos.length])

  return (
    <div className="repairs-page">
      <Helmet>
        <title>{`Phone Repair Services — ${STORE_NAME} | St. Paul, MN`}</title>
        <meta name="description" content={`Phone and electronics repair services in St. Paul — book an appointment online at ${STORE_NAME}.`} />
        <meta property="og:title" content={`Phone Repair Services — ${STORE_NAME} | St. Paul, MN`} />
        <meta property="og:description" content={`Phone and electronics repair services in St. Paul — book an appointment online at ${STORE_NAME}.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/repairs`} />
        <link rel="canonical" href={`${SITE_URL}/repairs`} />
      </Helmet>

      {/* ── Hero ── */}
      <div className="repairs-hero">
        <div className="container">
          <div className="fade-up" ref={heroRef}>
            <span className="section-eyebrow" style={{ color: 'rgba(255,255,255,0.5)' }}>Device Repairs</span>
            <h1 className="repairs-hero-title">We Fix Your Devices</h1>
            <p className="repairs-hero-subtitle">
              Fast, affordable repairs right on Rice Street. Screens, batteries, water damage, and more.
            </p>
          </div>
        </div>
      </div>

      {/* ── Services ── */}
      <section className="section">
        <div className="container">
          <div className="section-header centered fade-up" ref={servicesHeaderRef}>
            <span className="section-eyebrow">What We Fix</span>
            <h2 className="section-title">Repair Services</h2>
            <p className="section-subtitle">
              Professional device repairs at fair prices. Call us to check availability or drop in.
            </p>
          </div>
          {services.length > 0 ? (
            <div className="repairs-grid stagger-grid fade-up is-visible">
              {services.map(svc => (
                <div key={svc.id} className="repair-card">
                  {svc.image_url && (
                    <div className="repair-card-img">
                      <img src={svc.image_url} alt={svc.name} loading="lazy" />
                    </div>
                  )}
                  <div className="repair-card-body">
                    <h3>{svc.name}</h3>
                    <span className="repair-price">
                      {svc.price != null && svc.price !== '' ? svc.price : 'Call for Quote'}
                    </span>
                    {svc.description && <p>{svc.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="repairs-empty fade-up" ref={servicesEmptyRef}>
              <p>Repair services coming soon. Call us for pricing and availability.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Media ── */}
      {media.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <div className="section-header centered fade-up" ref={mediaHeaderRef}>
              <span className="section-eyebrow">Our Work</span>
              <h2 className="section-title">Before &amp; After</h2>
              <p className="section-subtitle">Real repairs done right here at {STORE_NAME}.</p>
            </div>
            <div className="repair-media-grid stagger-grid fade-up" ref={mediaGridRef}>
              {media.map(item => {
                if (item.type === 'video') {
                  return (
                    <div key={item.id} className="repair-media-item repair-media-video">
                      <video controls preload="metadata" playsInline>
                        <source src={item.url} />
                      </video>
                      {item.description && <p className="repair-media-desc">{item.description}</p>}
                    </div>
                  )
                }
                const photoIdx = photos.findIndex(p => p.id === item.id)
                return (
                  <button
                    key={item.id}
                    className="repair-media-item repair-media-photo"
                    onClick={() => setLightbox(photoIdx)}
                    aria-label={`View photo${item.description ? ': ' + item.description : ''}`}
                  >
                    <img src={item.url} alt={item.description || 'Repair photo'} loading="lazy" />
                    <div className="repair-media-overlay" aria-hidden="true">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                      </svg>
                    </div>
                    {item.description && <p className="repair-media-desc">{item.description}</p>}
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Book a Repair ── */}
      <section className="section" id="booking">
        <div className="container">
          <div className="section-header centered fade-up" ref={bookHeaderRef}>
            <span className="section-eyebrow">Schedule Online</span>
            <h2 className="section-title">Book a Repair</h2>
            <p className="section-subtitle">
              Pick a time that works for you. We'll confirm by phone within a few hours.
            </p>
          </div>
          <BookingForm services={services} hours={hours} ownerPhone={ownerPhone} />
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section section-alt repairs-cta-section">
        <div className="container">
          <div className="repairs-cta fade-up" ref={ctaRef}>
            <div className="repairs-cta-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.69 12 19.79 19.79 0 011.62 3.38 2 2 0 013.6 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
            </div>
            <div className="repairs-cta-text">
              <span className="section-eyebrow">Prefer to Call?</span>
              <h2 className="section-title">Talk to Us Directly</h2>
              <p>Drop in during store hours or call us to check availability and get a quick quote. We're at {STORE_ADDRESS.split(',')[0]}, open every day.</p>
            </div>
            <div className="repairs-cta-action" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <a href={STORE_PHONE_TEL} className="btn-primary repairs-call-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.69 12 19.79 19.79 0 011.62 3.38 2 2 0 013.6 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
                {STORE_PHONE}
              </a>
              <a href={STORE_PHONE_2_TEL} className="btn-primary repairs-call-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.69 12 19.79 19.79 0 011.62 3.38 2 2 0 013.6 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
                {STORE_PHONE_2}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Lightbox ── */}
      {lightbox !== null && photos[lightbox] && (
        <div
          className="repairs-lightbox"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
        >
          <button className="repairs-lb-close" onClick={() => setLightbox(null)} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          {photos.length > 1 && (
            <>
              <button className="repairs-lb-nav repairs-lb-prev" onClick={e => { e.stopPropagation(); setLightbox(i => (i - 1 + photos.length) % photos.length) }} aria-label="Previous photo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button className="repairs-lb-nav repairs-lb-next" onClick={e => { e.stopPropagation(); setLightbox(i => (i + 1) % photos.length) }} aria-label="Next photo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </>
          )}
          <div className="repairs-lb-img-wrap" onClick={e => e.stopPropagation()}>
            <img src={photos[lightbox].url} alt={photos[lightbox].description || 'Repair photo'} />
            {photos[lightbox].description && <p className="repairs-lb-caption">{photos[lightbox].description}</p>}
          </div>
          <div className="repairs-lb-counter" aria-live="polite">{lightbox + 1} / {photos.length}</div>
        </div>
      )}

    </div>
  )
}

/* ── Booking Form ───────────────────────────────────────────── */

const EMPTY_FORM = { serviceId: '', serviceName: '', date: '', time: '', name: '', phone: '', notes: '' }

function BookingForm({ services, hours, ownerPhone }) {
  // Date limits depend on the current date, so they're only set after hydration
  // (the pre-rendered HTML can't know the visitor's "today").
  const hydrated = useHydrated()
  const today = hydrated ? storeDateStr() : undefined
  const maxDate = hydrated ? storeDateStr(daysFromNow(90)) : undefined

  const [form, setForm]       = useState(EMPTY_FORM)
  const [errors, setErrors]   = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted]   = useState(false)
  const [waUrl, setWaUrl]     = useState('')
  const [confirmedForm, setConfirmedForm] = useState(null)

  const timeSlots = useMemo(() => getTimeSlotsForDate(form.date, hours), [form.date, hours])

  const dayName = form.date ? (() => {
    const [y, mo, d] = form.date.split('-').map(Number)
    return JS_DAY_NAMES[new Date(y, mo - 1, d).getDay()]
  })() : ''
  const dayRow = hours.find(h => h.day === dayName)
  const dayIsClosed = dayName && (dayRow?.is_closed || !dayRow)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: '' }))
    setSubmitError('')
  }

  // Reset time if it's no longer in new slot list
  useEffect(() => {
    if (form.time && !timeSlots.includes(form.time)) {
      setForm(f => ({ ...f, time: '' }))
    }
  }, [timeSlots]) // eslint-disable-line react-hooks/exhaustive-deps

  function validate() {
    const e = {}
    if (!form.date) e.date = 'Please select a date'
    else if (dayIsClosed) e.date = `We're closed on ${dayName}s — please pick another day`
    if (!form.time) e.time = 'Please select a time'
    if (!form.name.trim()) e.name = 'Your name is required'
    if (!form.phone.trim()) e.phone = 'Your phone number is required'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    setSubmitError('')

    const { error } = await supabase.from('bookings').insert({
      service_id:    form.serviceId || null,
      service_name:  form.serviceName || 'Not specified',
      customer_name: form.name.trim(),
      customer_phone: form.phone.trim(),
      booking_date:  form.date,
      booking_time:  form.time + ':00',
      notes:         form.notes.trim() || null,
      status:        'pending',
    })

    if (error) {
      setSubmitError(`Something went wrong. Please call us at ${STORE_PHONE} or ${STORE_PHONE_2}.`)
      setSubmitting(false)
      return
    }

    // Fire email notification — does not block the confirmation screen
    supabase.functions.invoke('notify-booking', {
      body: {
        customer_name:  form.name.trim(),
        customer_phone: form.phone.trim(),
        service_name:   form.serviceName,
        booking_date:   form.date,
        booking_time:   form.time,
        notes:          form.notes.trim() || null,
      },
    }).then(({ data, error }) => {
      if (error) console.warn('[notify-booking] invocation error:', error.message)
      else if (data?.error) console.warn('[notify-booking] email failed:', data.error, data.detail ?? '')
      else if (data?.skipped) console.info('[notify-booking] skipped:', data.skipped)
    })

    // Build WhatsApp notification URL
    if (ownerPhone) {
      const clean = ownerPhone.replace(/\D/g, '')
      const [y, mo, d] = form.date.split('-').map(Number)
      const dateDisplay = new Date(y, mo - 1, d).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
      const lines = [
        `🔧 New Repair Booking — ${STORE_NAME}`,
        '',
        `Customer: ${form.name.trim()}`,
        `Phone: ${form.phone.trim()}`,
        `Service: ${form.serviceName}`,
        `Date: ${dateDisplay}`,
        `Time: ${fmt12h(form.time)}`,
        form.notes.trim() ? `Notes: ${form.notes.trim()}` : '',
      ].filter(Boolean).join('\n')
      setWaUrl(`https://wa.me/${clean}?text=${encodeURIComponent(lines)}`)
    }

    setConfirmedForm({ ...form })
    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted && confirmedForm) {
    const [y, mo, d] = confirmedForm.date.split('-').map(Number)
    const dateDisplay = new Date(y, mo - 1, d).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    })
    return (
      <div className="booking-confirmation stagger-grid fade-up is-visible">
        <div className="booking-confirmation-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h3 className="booking-confirmation-title">Booking Request Sent!</h3>
        <p className="booking-confirmation-sub">
          We'll confirm your appointment by phone. Here's a summary:
        </p>
        <div className="booking-summary">
          <div className="booking-summary-row"><span>Service</span><strong>{confirmedForm.serviceName}</strong></div>
          <div className="booking-summary-row"><span>Date</span><strong>{dateDisplay}</strong></div>
          <div className="booking-summary-row"><span>Time</span><strong>{fmt12h(confirmedForm.time)}</strong></div>
          <div className="booking-summary-row"><span>Phone</span><strong>{confirmedForm.phone}</strong></div>
        </div>
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-primary booking-wa-btn">
            <WhatsAppIcon />
            Notify store via WhatsApp
          </a>
        )}
        <button
          className="btn-outline"
          onClick={() => { setSubmitted(false); setForm(EMPTY_FORM); setWaUrl(''); setConfirmedForm(null) }}
          style={{ marginTop: 12 }}
        >
          Book Another Repair
        </button>
      </div>
    )
  }

  return (
    <form className="booking-form fade-up is-visible" onSubmit={handleSubmit} noValidate>
      <div className="booking-form-inner">

        {/* Service */}
        <div className="booking-field booking-field-full">
          <label htmlFor="bf-service">
            Repair service <span className="booking-optional">(optional)</span>
          </label>
          {services.length === 0 ? (
            <p className="booking-no-services">
              No services listed yet — call us at <a href={STORE_PHONE_TEL}>{STORE_PHONE}</a> or <a href={STORE_PHONE_2_TEL}>{STORE_PHONE_2}</a> for a quote.
            </p>
          ) : (
            <select
              id="bf-service"
              className={`booking-select${errors.serviceId ? ' booking-input-err' : ''}`}
              value={form.serviceId}
              onChange={e => {
                const opt = services.find(s => s.id === e.target.value)
                set('serviceId', e.target.value)
                set('serviceName', opt?.name ?? '')
              }}
            >
              <option value="">Select a service…</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.price ? ` — ${s.price}` : ''}</option>
              ))}
            </select>
          )}
          {errors.serviceId && <span className="booking-err">{errors.serviceId}</span>}
        </div>

        {/* Date + Time */}
        <div className="booking-field">
          <label htmlFor="bf-date">
            Preferred date <span className="booking-req">*</span>
          </label>
          <input
            id="bf-date"
            type="date"
            className={`booking-input${errors.date ? ' booking-input-err' : ''}`}
            value={form.date}
            min={today}
            max={maxDate}
            onChange={e => set('date', e.target.value)}
          />
          {errors.date && <span className="booking-err">{errors.date}</span>}
        </div>

        <div className="booking-field">
          <label htmlFor="bf-time">
            Preferred time <span className="booking-req">*</span>
          </label>
          {form.date && dayIsClosed ? (
            <p className="booking-closed-note">We're closed on {dayName}s. Please pick another day.</p>
          ) : (
            <select
              id="bf-time"
              className={`booking-select${errors.time ? ' booking-input-err' : ''}`}
              value={form.time}
              onChange={e => set('time', e.target.value)}
              disabled={!form.date || timeSlots.length === 0}
            >
              <option value="">
                {!form.date ? 'Pick a date first' : timeSlots.length ? 'Select a time…' : 'No times left today — pick another day'}
              </option>
              {timeSlots.map(slot => (
                <option key={slot} value={slot}>{fmt12h(slot)}</option>
              ))}
            </select>
          )}
          {errors.time && <span className="booking-err">{errors.time}</span>}
        </div>

        {/* Name + Phone */}
        <div className="booking-field">
          <label htmlFor="bf-name">
            Your name <span className="booking-req">*</span>
          </label>
          <input
            id="bf-name"
            type="text"
            className={`booking-input${errors.name ? ' booking-input-err' : ''}`}
            placeholder="Full name"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            autoComplete="name"
          />
          {errors.name && <span className="booking-err">{errors.name}</span>}
        </div>

        <div className="booking-field">
          <label htmlFor="bf-phone">
            Phone number <span className="booking-req">*</span>
          </label>
          <input
            id="bf-phone"
            type="tel"
            className={`booking-input${errors.phone ? ' booking-input-err' : ''}`}
            placeholder="(612) 555-0123"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            autoComplete="tel"
          />
          {errors.phone && <span className="booking-err">{errors.phone}</span>}
        </div>

        {/* Notes */}
        <div className="booking-field booking-field-full">
          <label htmlFor="bf-notes">Notes <span className="booking-optional">(optional)</span></label>
          <textarea
            id="bf-notes"
            className="booking-textarea"
            placeholder="Device model, issue description, anything helpful…"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={3}
          />
        </div>

        {/* Submit */}
        <div className="booking-field booking-field-full booking-submit-row">
          {submitError && <p className="booking-submit-err">{submitError}</p>}
          <button
            type="submit"
            className="btn-primary booking-submit-btn"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="booking-spinner" aria-hidden="true" />
                Submitting…
              </>
            ) : (
              <>
                <CalendarIcon />
                Request Appointment
              </>
            )}
          </button>
          <p className="booking-note">We'll call to confirm within a few hours.</p>
        </div>

      </div>
    </form>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
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

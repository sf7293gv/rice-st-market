// Plans page — fetches prepaid carrier plans from Supabase, ordered by display_order.
// Mirrors Electronics.jsx's structure (card grid, "Call for Quote" fallback, inquiry
// modal), but plans aren't rows in the `products` table, so the inquiry submitted here
// omits product_id (nullable, FK'd to products specifically) and only sets product_name.
// A "Carriers We Carry" section (from the `carriers` table) sits above the plan cards and
// is hidden when that table is empty. The carrier intro sentence, FAQ, and FAQPage JSON-LD
// are built from the same carriers rows, so new carriers appear in all of them automatically.
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useFadeIn } from '../hooks/useScrollAnimation'
import { Helmet } from 'react-helmet-async'
import { STORE_NAME, STORE_PHONE, STORE_PHONE_TEL, SITE_URL } from '../lib/siteConfig'
import { getPrerenderData } from '../lib/prerenderData'
import './Plans.css'

const DEFAULT_MSG = (name) => `I'm interested in the ${name} plan, is it available?`

const PAGE_TITLE = 'Prepaid Plans: T-Mobile, Verizon, AT&T, Xfinity Mobile & More | St. Paul, MN'
const PAGE_DESCRIPTION = `Prepaid and wireless plans from T-Mobile, Verizon, AT&T, Metro, Boost, Total Wireless, Xfinity Mobile, Tracfone and H2O at ${STORE_NAME} in St. Paul, MN.`

// ['A', 'B', 'C'] → "A, B and C"
function joinNames(names) {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

// FAQ entries shared by the visible FAQ section and the FAQPage JSON-LD.
function buildFaqs(carrierNames) {
  if (carrierNames.length === 0) return []
  const faqs = [{
    q: 'Which wireless carriers do you carry?',
    a: `We carry prepaid and wireless service from ${joinNames(carrierNames)}. Stop by or call ${STORE_PHONE} for details.`,
  }]
  if (carrierNames.includes('Xfinity Mobile')) {
    faqs.push({
      q: 'Do you carry Xfinity Mobile?',
      a: `Yes, Xfinity Mobile is available at our store. Stop by or call ${STORE_PHONE} for details.`,
    })
  }
  return faqs
}

export default function Plans() {
  // Start from the build-time snapshot (if any) so the pre-rendered HTML — carrier names,
  // intro and FAQ — hydrates without a mismatch; live data replaces it after mount.
  const [plans, setPlans] = useState(() => getPrerenderData('plans') ?? [])
  const [carriers, setCarriers] = useState(() => getPrerenderData('carriers') ?? [])
  const [loading, setLoading] = useState(() => getPrerenderData('plans') === undefined)
  const [inquirePlan, setInquirePlan] = useState(null)

  const headerRef = useFadeIn()
  const carriersRef = useFadeIn()

  function handleCloseModal() {
    setInquirePlan(null)
  }

  useEffect(() => {
    async function fetchPlans() {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('display_order', { ascending: true })
      if (data) setPlans(data)
      if (error) console.error('plans fetch error:', error)
      setLoading(false)
    }
    fetchPlans()
  }, [])

  useEffect(() => {
    supabase
      .from('carriers')
      .select('*')
      .order('display_order', { ascending: true })
      .then(({ data, error }) => {
        if (data) setCarriers(data)
        if (error) console.error('carriers fetch error:', error)
      })
  }, [])

  const carrierNames = carriers.map(c => c.name)
  const faqs = buildFaqs(carrierNames)
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <div className="plans-page">
      <Helmet>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/plans`} />
        <link rel="canonical" href={`${SITE_URL}/plans`} />
        {faqs.length > 0 && (
          <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        )}
      </Helmet>

      {/* ── Hero ── */}
      <div className="plans-hero">
        <div className="container">
          <div className="fade-up" ref={headerRef}>
            <span className="section-eyebrow" style={{ color: 'rgba(255,255,255,0.5)' }}>Prepaid Plans</span>
            <h1 className="plans-hero-title">Plans</h1>
            <p className="plans-hero-subtitle">
              Prepaid carrier plans at fair prices — talk, text, and data to fit your needs.
            </p>
          </div>
        </div>
      </div>

      {/* ── Carriers We Carry ── */}
      {carriers.length > 0 && (
        <section className="carriers-section">
          <div className="container">
            <div className="section-header centered fade-up" ref={carriersRef}>
              <span className="section-eyebrow">Carriers</span>
              <h2 className="section-title">Carriers We Carry</h2>
              <p className="section-subtitle carriers-intro">
                {STORE_NAME} carries prepaid and wireless service from {joinNames(carrierNames)}.
                {' '}Stop by 1110 Rice St, St. Paul, MN or call <a href={STORE_PHONE_TEL}>{STORE_PHONE}</a>.
              </p>
            </div>
            <div className="carriers-grid">
              {carriers.map(carrier => (
                <div key={carrier.id} className="carrier-card">
                  {carrier.logo_url
                    ? (
                      <div className="carrier-logo">
                        <img src={carrier.logo_url} alt={`${carrier.name} logo`} loading="lazy" />
                      </div>
                    )
                    : <div className="carrier-logo carrier-logo-fallback">
                        {/* Non-breaking hyphens keep names like "T-Mobile" on one line */}
                        {carrier.name.replace(/-/g, '\u2011')}
                      </div>
                  }
                  {/* The name tile already shows the name when there's no logo */}
                  {carrier.logo_url && <p className="carrier-name">{carrier.name}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Grid ── */}
      <section className="plans-grid-section">
        <div className="container">
          {loading ? (
            <div className="plans-loading">
              <div className="plans-spinner" aria-label="Loading plans" />
              <p>Loading plans…</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="plans-empty">
              <p className="plans-empty-icon" aria-hidden="true">📶</p>
              <p className="plans-empty-title">No plans yet</p>
              <p className="plans-empty-sub">Check back soon or ask us in store.</p>
            </div>
          ) : (
            <div className="plans-grid stagger-grid fade-up is-visible">
              {plans.map(plan => (
                <PlanCard key={plan.id} plan={plan} onInquire={setInquirePlan} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      {faqs.length > 0 && (
        <section className="plans-faq-section">
          <div className="container">
            <div className="section-header centered">
              <span className="section-eyebrow">FAQ</span>
              <h2 className="section-title">Common Questions</h2>
            </div>
            <dl className="plans-faq">
              {faqs.map(f => (
                <div key={f.q} className="plans-faq-item">
                  <dt>{f.q}</dt>
                  <dd>{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      {inquirePlan && (
        <InquiryModal plan={inquirePlan} onClose={handleCloseModal} />
      )}
    </div>
  )
}

function PlanCard({ plan, onInquire }) {
  return (
    <div className="plan-card">
      <div className="plan-image">
        {plan.image_url
          ? <img src={plan.image_url} alt={plan.carrier_name} loading="lazy" />
          : (
            <div className="plan-img-placeholder">
              <SignalIcon />
            </div>
          )
        }
        {plan.data_amount && (
          <span className="plan-data-tag">{plan.data_amount}</span>
        )}
      </div>
      <div className="plan-body">
        <p className="plan-carrier">{plan.carrier_name}</p>
        <h3 className="plan-name">{plan.plan_name}</h3>
        {plan.features && (
          <p className="plan-features">{plan.features}</p>
        )}
        <p className="plan-price">
          {plan.price != null ? `$${Number(plan.price).toFixed(2)}` : 'Call for Quote'}
        </p>
        <button
          className="plan-inquire-btn"
          onClick={() => onInquire(plan)}
        >
          Inquire
        </button>
      </div>
    </div>
  )
}

function InquiryModal({ plan, onClose }) {
  const planLabel = `${plan.carrier_name} — ${plan.plan_name}`
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState(DEFAULT_MSG(planLabel))
  const [state, setState] = useState('idle')
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!name.trim()) e.name = 'Name is required'
    if (!phone.trim()) e.phone = 'Phone number is required'
    if (!message.trim()) e.message = 'Message is required'
    return e
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setState('submitting')
    setErrors({})

    // No product_id — plans aren't rows in the `products` table that
    // inquiries.product_id is foreign-keyed to. product_name carries the context instead.
    const { error } = await supabase.from('inquiries').insert({
      product_name: planLabel,
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      message: message.trim(),
    })

    if (error) {
      console.error('[inquiry submit]', error)
      setState('error')
      return
    }

    supabase.functions.invoke('notify-inquiry', {
      body: {
        product_name: planLabel,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        message: message.trim(),
      },
    }).then(({ error: fnErr }) => {
      if (fnErr) console.warn('[notify-inquiry]', fnErr)
    })

    setState('success')
  }

  function handleBackdrop(ev) {
    if (ev.target === ev.currentTarget) onClose()
  }

  return (
    <div className="inq-overlay" onClick={handleBackdrop} role="dialog" aria-modal="true" aria-label="Plan inquiry">
      <div className="inq-modal">
        <div className="inq-modal-hd">
          <span>Inquire About Plan</span>
          <button className="inq-modal-x" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {state === 'success' ? (
          <div className="inq-success">
            <div className="inq-success-check" aria-hidden="true">✓</div>
            <p className="inq-success-title">Inquiry Sent!</p>
            <p className="inq-success-sub">
              Thanks! We'll reach out to you at {phone} as soon as possible.
            </p>
            <button className="inq-btn-primary" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form className="inq-form" onSubmit={handleSubmit} noValidate>
            <p className="inq-product-name">{planLabel}</p>

            {state === 'error' && (
              <div className="inq-form-err">Something went wrong. Please try again.</div>
            )}

            <div className="inq-field">
              <label htmlFor="inq-name">Your Name *</label>
              <input
                id="inq-name"
                className={`inq-input${errors.name ? ' err' : ''}`}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Full name"
                disabled={state === 'submitting'}
              />
              {errors.name && <span className="inq-field-err">{errors.name}</span>}
            </div>

            <div className="inq-field">
              <label htmlFor="inq-phone">Phone Number *</label>
              <input
                id="inq-phone"
                type="tel"
                className={`inq-input${errors.phone ? ' err' : ''}`}
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(612) 555-1234"
                disabled={state === 'submitting'}
              />
              {errors.phone && <span className="inq-field-err">{errors.phone}</span>}
            </div>

            <div className="inq-field">
              <label htmlFor="inq-msg">Message *</label>
              <textarea
                id="inq-msg"
                className={`inq-textarea${errors.message ? ' err' : ''}`}
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                disabled={state === 'submitting'}
              />
              {errors.message && <span className="inq-field-err">{errors.message}</span>}
            </div>

            <div className="inq-modal-ft">
              <button
                type="button"
                className="inq-btn-ghost"
                onClick={onClose}
                disabled={state === 'submitting'}
              >
                Cancel
              </button>
              <button type="submit" className="inq-btn-primary" disabled={state === 'submitting'}>
                {state === 'submitting' ? 'Sending…' : 'Send Inquiry'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function SignalIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="20" x2="4" y2="20"/>
      <line x1="9" y1="16" x2="9" y2="20"/>
      <line x1="14" y1="11" x2="14" y2="20"/>
      <line x1="19" y1="5" x2="19" y2="20"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

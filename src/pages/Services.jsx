// Services overview page — static content listing all service categories offered by the store.
import { useFadeIn } from '../hooks/useScrollAnimation'
import { Helmet } from 'react-helmet-async'
import { STORE_NAME, STORE_PHONE, STORE_PHONE_TEL } from '../lib/siteConfig'
import './Services.css'

const SERVICES = [
  {
    id: 'phone',
    icon: <PhoneRepairIcon />,
    title: 'Phone Repair',
    tagline: 'Fast, affordable fixes while you wait',
    description:
      "Cracked screen? Dead battery? We handle common smartphone repairs quickly and at fair prices. Bring it in and we'll take a look — no appointment needed.",
    details: ['Screen replacement', 'Battery replacement', 'Charging port repair', 'Most major brands serviced'],
  },
  {
    id: 'keys',
    icon: <KeyIcon />,
    title: 'Key Duplication',
    tagline: 'Copies made in minutes',
    description:
      'Need a spare house key or copy for a family member? We cut keys on the spot. Quick, accurate, and priced right.',
    details: ['House & apartment keys', 'Standard door keys', 'Ready in minutes', 'Affordable pricing'],
  },
  {
    id: 'tobacco',
    icon: <TobaccoIcon />,
    title: 'Tobacco & Accessories',
    tagline: 'Wide selection of quality products',
    description:
      "We carry a curated selection of tobacco products and accessories. Our knowledgeable staff can help you find exactly what you're looking for.",
    details: ['Cigarettes & cigars', 'Rolling papers', 'Lighters & accessories', 'Variety of brands'],
  },
  {
    id: 'grocery',
    icon: <GroceryIcon />,
    title: 'Grocery & Deli',
    tagline: 'Stocked for your everyday needs',
    description:
      'From fresh-made deli sandwiches to pantry staples, we keep the shelves stocked with everything a neighborhood needs. Convenient, affordable, and right here on Rice Street.',
    details: ['Fresh deli & hot food', 'Everyday groceries', 'Beverages & snacks', 'Household essentials'],
  },
]

export default function Services() {
  const headerRef = useFadeIn()
  const gridRef = useFadeIn()
  const ctaRef = useFadeIn()

  return (
    <div className="services-page">
      <Helmet>
        <title>Services — {STORE_NAME} | St. Paul, MN</title>
        <meta name="description" content={`Services offered at ${STORE_NAME} — grocery, deli, electronics, and repairs.`} />
        <meta property="og:title" content={`Services — ${STORE_NAME} | St. Paul, MN`} />
        <meta property="og:description" content={`Services offered at ${STORE_NAME} — grocery, deli, electronics, and repairs.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://unity-foods.vercel.app/services" />
      </Helmet>


      {/* ── Header ── */}
      <div className="services-header">
        <div className="container">
          <div className="fade-up" ref={headerRef}>
            <span className="section-eyebrow" style={{ color: 'rgba(255,255,255,0.5)' }}>What We Offer</span>
            <h1 className="services-title">Our Services</h1>
            <p className="services-subtitle">
              More than groceries — {STORE_NAME} offers a range of community services right in the neighborhood.
            </p>
          </div>
        </div>
      </div>

      {/* ── Services grid ── */}
      <section className="section">
        <div className="container">
          <div className="services-grid stagger-grid fade-up" ref={gridRef}>
            {SERVICES.map(service => (
              <div key={service.id} className="service-card">
                <div className="service-icon-wrap">{service.icon}</div>
                <div className="service-content">
                  <p className="service-tagline">{service.tagline}</p>
                  <h2 className="service-name">{service.title}</h2>
                  <p className="service-description">{service.description}</p>
                  <ul className="service-details">
                    {service.details.map((d, i) => (
                      <li key={i}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section section-alt services-cta-section">
        <div className="container">
          <div className="services-cta fade-up" ref={ctaRef}>
            <h2>Have a Question About Our Services?</h2>
            <p>Stop by the store or give us a call — we're open every day from 8 AM to 10 PM.</p>
            <a href={STORE_PHONE_TEL} className="btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.69 12 19.79 19.79 0 011.62 3.38 2 2 0 013.6 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              {STORE_PHONE}
            </a>
          </div>
        </div>
      </section>

    </div>
  )
}

function PhoneRepairIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
  )
}

function TobaccoIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 8C8 10 5.9 16.17 3.82 19.34A1 1 0 004.64 21h8.72a1 1 0 00.95-.68C16.77 14.78 19 14 19 14V7s-1 .27-2 1z"/>
      <path d="M9 3s-1.5 3 2 3"/>
    </svg>
  )
}

function GroceryIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  )
}

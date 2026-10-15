// Electronics page — fetches active products from Supabase, filterable by category and condition.
// Products without a price show "Call for Quote". Inquiry modal fires the notify-inquiry Edge Function.
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useFadeIn } from '../hooks/useScrollAnimation'
import { Helmet } from 'react-helmet-async'
import { STORE_NAME, SITE_URL } from '../lib/siteConfig'
import './Electronics.css'

const DEFAULT_MSG = (name) => `I'm interested in ${name}, is it available?`

const CATEGORIES = [
  { value: 'all',     label: 'All' },
  { value: 'phones',  label: 'Phones' },
  { value: 'laptops', label: 'Laptops' },
  { value: 'pcs',     label: 'PCs' },
]

function categoryLabel(value) {
  return CATEGORIES.find(c => c.value === value)?.label ?? value
}

export default function Electronics() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [inquireProduct, setInquireProduct] = useState(null)

  const headerRef = useFadeIn()

  function handleCloseModal() {
    setInquireProduct(null)
  }

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .in('category', ['phones', 'laptops', 'pcs'])
        .order('created_at', { ascending: false })
      if (data) setProducts(data)
      if (error) console.error('products fetch error:', error)
      setLoading(false)
    }
    fetchProducts()
  }, [])

  const filtered =
    activeCategory === 'all'
      ? products
      : products.filter(p => p.category === activeCategory)

  return (
    <div className="electronics-page">
      <Helmet>
        <title>Electronics &amp; Phones — {STORE_NAME} | St. Paul, MN</title>
        <meta name="description" content={`Shop new and used phones, electronics, and accessories at ${STORE_NAME} in St. Paul.`} />
        <meta property="og:title" content={`Electronics & Phones — ${STORE_NAME} | St. Paul, MN`} />
        <meta property="og:description" content={`Shop new and used phones, electronics, and accessories at ${STORE_NAME} in St. Paul.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/electronics`} />
      </Helmet>

      {/* ── Hero ── */}
      <div className="electronics-hero">
        <div className="container">
          <div className="fade-up" ref={headerRef}>
            <span className="section-eyebrow" style={{ color: 'rgba(255,255,255,0.5)' }}>For Sale</span>
            <h1 className="electronics-hero-title">Electronics</h1>
            <p className="electronics-hero-subtitle">
              New and used phones, electronics, and accessories — quality products at fair prices.
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="electronics-filters-bar">
        <div className="container">
          <div className="electronics-filters">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                className={`electronics-filter-btn${activeCategory === cat.value ? ' active' : ''}`}
                onClick={() => setActiveCategory(cat.value)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      <section className="electronics-grid-section">
        <div className="container">
          {loading ? (
            <div className="electronics-loading">
              <div className="electronics-spinner" aria-label="Loading products" />
              <p>Loading products…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="electronics-empty">
              <p className="electronics-empty-icon" aria-hidden="true">📱</p>
              <p className="electronics-empty-title">
                {activeCategory === 'all' ? 'No products yet' : `No ${CATEGORIES.find(c => c.value === activeCategory)?.label} available`}
              </p>
              <p className="electronics-empty-sub">Check back soon or ask us in store.</p>
            </div>
          ) : (
            <div className="electronics-grid stagger-grid fade-up is-visible">
              {filtered.map(product => (
                <ProductCard key={product.id} product={product} onInquire={setInquireProduct} />
              ))}
            </div>
          )}
        </div>
      </section>

      {inquireProduct && (
        <InquiryModal product={inquireProduct} onClose={handleCloseModal} />
      )}
    </div>
  )
}

function ProductCard({ product, onInquire }) {
  return (
    <div className={`product-card${!product.in_stock ? ' out-of-stock' : ''}`}>
      <div className="product-image">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} loading="lazy" />
          : (
            <div className="product-img-placeholder">
              <DeviceIcon />
            </div>
          )
        }
        <div className="product-badges">
          <span className={`product-condition-badge ${product.condition}`}>
            {product.condition === 'new' ? 'New' : 'Used'}
          </span>
          {!product.in_stock && (
            <span className="product-oos-badge">Sold Out</span>
          )}
        </div>
        {product.category && (
          <span className="product-category-tag">
            {categoryLabel(product.category)}
          </span>
        )}
      </div>
      <div className="product-body">
        <h3 className="product-name">{product.name}</h3>
        {product.description && (
          <p className="product-description">{product.description}</p>
        )}
        <p className="product-price">
          {product.price != null ? `$${Number(product.price).toFixed(2)}` : 'Call for Quote'}
        </p>
        <button
          className="product-inquire-btn"
          onClick={() => onInquire(product)}
        >
          Inquire
        </button>
      </div>
    </div>
  )
}

function InquiryModal({ product, onClose }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState(DEFAULT_MSG(product.name))
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

    const { error } = await supabase.from('inquiries').insert({
      product_id: product.id,
      product_name: product.name,
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
        product_name: product.name,
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
    <div className="inq-overlay" onClick={handleBackdrop} role="dialog" aria-modal="true" aria-label="Product inquiry">
      <div className="inq-modal">
        <div className="inq-modal-hd">
          <span>Inquire About Product</span>
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
            <p className="inq-product-name">{product.name}</p>

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

function DeviceIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
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

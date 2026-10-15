// Tobacco page — fetches products from the tobacco_products table and renders a simple image grid.
// No prices, no filters, no inquiry modal — display only.
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useFadeIn } from '../hooks/useScrollAnimation'
import { Helmet } from 'react-helmet-async'
import { STORE_NAME, STORE_ADDRESS, SITE_URL } from '../lib/siteConfig'
import './Tobacco.css'

export default function Tobacco() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const headerRef = useFadeIn()

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase
        .from('tobacco_products')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setProducts(data)
      if (error) console.error('tobacco_products fetch error:', error)
      setLoading(false)
    }
    fetchProducts()
  }, [])

  return (
    <div className="tobacco-page">
      <Helmet>
        <title>Tobacco — {STORE_NAME} | St. Paul, MN</title>
        <meta name="description" content={`Browse our tobacco selection at ${STORE_NAME} in St. Paul. Visit us at ${STORE_ADDRESS.split(',')[0]} for pricing and availability.`} />
        <meta property="og:title" content={`Tobacco — ${STORE_NAME} | St. Paul, MN`} />
        <meta property="og:description" content={`Browse our tobacco selection at ${STORE_NAME} in St. Paul.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/tobacco`} />
      </Helmet>

      {/* ── Hero ── */}
      <div className="tobacco-hero">
        <div className="container">
          <div className="fade-up" ref={headerRef}>
            <span className="section-eyebrow" style={{ color: 'rgba(255,255,255,0.5)' }}>In Store</span>
            <h1 className="tobacco-hero-title">Tobacco</h1>
            <p className="tobacco-hero-subtitle">
              Browse our in-store selection. Visit us at {STORE_ADDRESS.split(',')[0]} for pricing and availability.
            </p>
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      <section className="tobacco-grid-section">
        <div className="container">
          {loading ? (
            <div className="tobacco-loading">
              <div className="tobacco-spinner" aria-label="Loading products" />
              <p>Loading products…</p>
            </div>
          ) : products.length === 0 ? (
            <div className="tobacco-empty">
              <p className="tobacco-empty-icon" aria-hidden="true">🚬</p>
              <p className="tobacco-empty-title">No products listed yet</p>
              <p className="tobacco-empty-sub">Check back soon or visit us in store.</p>
            </div>
          ) : (
            <div className="tobacco-grid stagger-grid fade-up is-visible">
              {products.map(product => (
                <div key={product.id} className="tobacco-card">
                  <div className="tobacco-card-image">
                    {product.image_url
                      ? <img src={product.image_url} alt={product.name} loading="lazy" />
                      : (
                        <div className="tobacco-img-placeholder">
                          <PackageIcon />
                        </div>
                      )
                    }
                  </div>
                  <div className="tobacco-card-body">
                    <h3 className="tobacco-card-name">{product.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function PackageIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  )
}

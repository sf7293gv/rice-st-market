// Deli page — fetches active items in the Deli/Hot Food categories and renders a
// filterable grid. Based on the former Menu.jsx's fetch/render logic, scoped down to
// this page's own category subset (no "All" — clicking the active filter again clears
// it back to showing both categories combined).
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useFadeIn } from '../hooks/useScrollAnimation'
import { Helmet } from 'react-helmet-async'
import { STORE_NAME } from '../lib/siteConfig'
import './Deli.css'

const CATEGORIES = ['Deli', 'Hot Food']

export default function Deli() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryParam = searchParams.get('category')
  const activeCategory = CATEGORIES.includes(categoryParam) ? categoryParam : null

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  function selectCategory(cat) {
    setSearchParams(cat === activeCategory ? {} : { category: cat })
  }

  const headerRef = useFadeIn()
  const gridRef = useFadeIn()

  useEffect(() => {
    async function fetchItems() {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('name')
      if (data) setItems(data)
      if (error) console.error('Error fetching deli items:', error)
      setLoading(false)
    }
    fetchItems()
  }, [])

  const inScope = items.filter(item => CATEGORIES.includes(item.category))
  const filtered = activeCategory
    ? inScope.filter(item => item.category === activeCategory)
    : inScope

  return (
    <div className="deli-page">
      <Helmet>
        <title>Deli — {STORE_NAME} | St. Paul, MN</title>
        <meta name="description" content={`Browse our fresh deli sandwiches and hot food menu at ${STORE_NAME} in St. Paul.`} />
        <meta property="og:title" content={`Deli — ${STORE_NAME} | St. Paul, MN`} />
        <meta property="og:description" content={`Browse our fresh deli sandwiches and hot food menu at ${STORE_NAME} in St. Paul.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://unity-foods.vercel.app/deli" />
      </Helmet>

      {/* ── Page header ── */}
      <div className="deli-header-section">
        <div className="container">
          <div className="fade-up" ref={headerRef}>
            <span className="section-eyebrow">Our Selection</span>
            <h1 className="deli-page-title">Deli</h1>
            <p className="deli-page-subtitle">
              Fresh-made deli sandwiches and hot food — everything you need, right in your neighborhood.
            </p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="deli-filters-bar">
        <div className="container">
          <div className="deli-filters">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`filter-btn${activeCategory === cat ? ' active' : ''}`}
                onClick={() => selectCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      <section className="deli-grid-section">
        <div className="container">
          {loading ? (
            <div className="deli-loading">
              <div className="loading-spinner" aria-label="Loading deli items" />
              <p>Loading deli…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="deli-empty">
              <p className="empty-icon" aria-hidden="true">🥪</p>
              <p className="empty-title">
                {activeCategory
                  ? `No items in ${activeCategory}`
                  : 'No items yet'}
              </p>
              <p className="empty-sub">Check back soon or ask us in store.</p>
            </div>
          ) : (
            <div className="items-grid stagger-grid fade-up" ref={gridRef}>
              {filtered.map(item => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  )
}

function ItemCard({ item }) {
  return (
    <div className={`item-card${!item.in_stock ? ' out-of-stock' : ''}`}>
      <div className="item-image">
        {item.image_url
          ? <img src={item.image_url} alt={item.name} loading="lazy" />
          : (
            <div className="item-img-placeholder">
              <FoodIcon />
            </div>
          )
        }
        <div className="item-badges">
          {item.featured && <span className="badge badge-featured">Featured</span>}
          {!item.in_stock && <span className="badge badge-oos">Out of Stock</span>}
        </div>
        {item.category && (
          <span className="item-category-tag">{item.category}</span>
        )}
      </div>
      <div className="item-body">
        <h3 className="item-name">{item.name}</h3>
        {item.description && (
          <p className="item-description">{item.description}</p>
        )}
        {item.price != null && (
          <p className="item-price">${Number(item.price).toFixed(2)}</p>
        )}
      </div>
    </div>
  )
}

function FoodIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8h1a4 4 0 010 8h-1"/>
      <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>
      <line x1="6" y1="1" x2="6" y2="4"/>
      <line x1="10" y1="1" x2="10" y2="4"/>
      <line x1="14" y1="1" x2="14" y2="4"/>
    </svg>
  )
}

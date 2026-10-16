// Grocery page — fetches active items in the Groceries/Drinks/Snacks categories and
// renders a filterable grid. Based on the former Menu.jsx's fetch/render logic, scoped
// down to this page's own category subset (no "All" — clicking the active filter again
// clears it back to showing all three categories combined).
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useFadeIn } from '../hooks/useScrollAnimation'
import { Helmet } from 'react-helmet-async'
import { STORE_NAME, SITE_URL } from '../lib/siteConfig'
import './Grocery.css'

const CATEGORIES = ['Groceries', 'Drinks', 'Snacks']

export default function Grocery() {
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
      if (error) console.error('Error fetching grocery items:', error)
      setLoading(false)
    }
    fetchItems()
  }, [])

  const inScope = items.filter(item => CATEGORIES.includes(item.category))
  const filtered = activeCategory
    ? inScope.filter(item => item.category === activeCategory)
    : inScope

  return (
    <div className="grocery-page">
      <Helmet>
        <title>{`Grocery — ${STORE_NAME} | St. Paul, MN`}</title>
        <meta name="description" content={`Browse our grocery selection — pantry staples, drinks, and snacks — at ${STORE_NAME} in St. Paul.`} />
        <meta property="og:title" content={`Grocery — ${STORE_NAME} | St. Paul, MN`} />
        <meta property="og:description" content={`Browse our grocery selection — pantry staples, drinks, and snacks — at ${STORE_NAME} in St. Paul.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/grocery`} />
        <link rel="canonical" href={`${SITE_URL}/grocery`} />
      </Helmet>

      {/* ── Page header ── */}
      <div className="grocery-header-section">
        <div className="container">
          <div className="fade-up" ref={headerRef}>
            <span className="section-eyebrow">Our Selection</span>
            <h1 className="grocery-page-title">Grocery</h1>
            <p className="grocery-page-subtitle">
              Everyday groceries, drinks, and snacks — everything you need, right in your neighborhood.
            </p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="grocery-filters-bar">
        <div className="container">
          <div className="grocery-filters">
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
      <section className="grocery-grid-section">
        <div className="container">
          {loading ? (
            <div className="grocery-loading">
              <div className="loading-spinner" aria-label="Loading grocery items" />
              <p>Loading grocery…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="grocery-empty">
              <p className="empty-icon" aria-hidden="true">🛒</p>
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

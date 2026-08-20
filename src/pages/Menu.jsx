// Menu page — fetches active menu items from Supabase and renders a filterable grid by category.
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useFadeIn } from '../hooks/useScrollAnimation'
import { Helmet } from 'react-helmet-async'
import { STORE_NAME } from '../lib/siteConfig'
import './Menu.css'

const CATEGORIES = ['All', 'Deli', 'Hot Food', 'Groceries', 'Drinks', 'Snacks']

export default function Menu() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')

  const headerRef = useFadeIn()
  const gridRef = useFadeIn()

  useEffect(() => {
    async function fetchItems() {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('name')
      if (data) setItems(data)
      if (error) console.error('Error fetching menu items:', error)
      setLoading(false)
    }
    fetchItems()
  }, [])

  const filtered =
    activeCategory === 'All'
      ? items
      : items.filter(item => item.category === activeCategory)

  return (
    <div className="menu-page">
      <Helmet>
        <title>Menu — {STORE_NAME} | St. Paul, MN</title>
        <meta name="description" content={`Browse our fresh deli and grocery menu at ${STORE_NAME} in St. Paul.`} />
        <meta property="og:title" content={`Menu — ${STORE_NAME} | St. Paul, MN`} />
        <meta property="og:description" content={`Browse our fresh deli and grocery menu at ${STORE_NAME} in St. Paul.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://unity-foods.vercel.app/menu" />
      </Helmet>

      {/* ── Page header ── */}
      <div className="menu-header-section">
        <div className="container">
          <div className="fade-up" ref={headerRef}>
            <span className="section-eyebrow">Our Selection</span>
            <h1 className="menu-page-title">Menu & Grocery</h1>
            <p className="menu-page-subtitle">
              Fresh deli, hot food, groceries, drinks, and snacks — everything you need, right in your neighborhood.
            </p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="menu-filters-bar">
        <div className="container">
          <div className="menu-filters">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`filter-btn${activeCategory === cat ? ' active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      <section className="menu-grid-section">
        <div className="container">
          {loading ? (
            <div className="menu-loading">
              <div className="loading-spinner" aria-label="Loading menu items" />
              <p>Loading menu…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="menu-empty">
              <p className="empty-icon" aria-hidden="true">🛒</p>
              <p className="empty-title">
                {activeCategory === 'All'
                  ? 'No items yet'
                  : `No items in ${activeCategory}`}
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

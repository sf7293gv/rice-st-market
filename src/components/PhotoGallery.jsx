// Photo gallery for a public page, from the page_photos table (Admin → Page Photos).
// Starts from the build-time snapshot (scripts/prerender.mjs), so the heading, intro line and
// photos (with captions as alt text) are in the pre-rendered HTML; live rows replace it after
// mount. Renders nothing when the page has no photos. Shows the first 9 with "Show more".
// Tap a photo to enlarge it; the viewer supports Esc, ← / → and previous/next buttons.
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getPrerenderData } from '../lib/prerenderData'
import { STORE_NAME } from '../lib/siteConfig'
import './PhotoGallery.css'

const INITIAL_COUNT = 9

export default function PhotoGallery({ page, eyebrow, title, subtitle }) {
  const [photos, setPhotos] = useState(() => getPrerenderData('pagePhotos')?.[page] ?? [])
  const [showAll, setShowAll] = useState(false)
  const [open, setOpen] = useState(null)        // index of the enlarged photo, or null
  const closeRef = useRef(null)
  const lastTriggerRef = useRef(null)           // thumbnail to refocus when the viewer closes

  useEffect(() => {
    supabase
      .from('page_photos')
      .select('id, image_url, caption')
      .eq('page', page)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error(`page_photos (${page}) fetch error:`, error)
        if (data) setPhotos(data)
      })
  }, [page])

  // Runs when the viewer opens or closes (not on every next/previous step).
  const isOpen = open !== null
  useEffect(() => {
    if (!isOpen) return
    function onKey(e) {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight') setOpen(i => (i + 1) % photos.length)
      if (e.key === 'ArrowLeft') setOpen(i => (i - 1 + photos.length) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const trigger = lastTriggerRef.current
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      trigger?.focus()
    }
  }, [isOpen, photos.length])

  if (photos.length === 0) return null

  const visible = showAll ? photos : photos.slice(0, INITIAL_COUNT)
  const altFor = p => p.caption || `Inside ${STORE_NAME}`
  const step = (e, d) => { e.stopPropagation(); setOpen(i => (i + d + photos.length) % photos.length) }

  return (
    <section className="section photo-gallery-section">
      <div className="container">
        <div className="section-header centered">
          {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="section-subtitle photo-gallery-subtitle">{subtitle}</p>}
        </div>

        <div className="photo-gallery-grid">
          {visible.map((p, i) => (
            <figure key={p.id} className="photo-gallery-item">
              <button
                type="button"
                className="photo-gallery-thumb"
                onClick={e => { lastTriggerRef.current = e.currentTarget; setOpen(i) }}
                aria-label={`Enlarge photo: ${altFor(p)}`}
              >
                <img src={p.image_url} alt={altFor(p)} loading="lazy" decoding="async" />
              </button>
              {p.caption && <figcaption className="photo-gallery-caption">{p.caption}</figcaption>}
            </figure>
          ))}
        </div>

        {photos.length > INITIAL_COUNT && !showAll && (
          <div className="photo-gallery-actions">
            <button type="button" className="btn-outline" onClick={() => setShowAll(true)}>
              Show more photos ({photos.length - INITIAL_COUNT})
            </button>
          </div>
        )}
      </div>

      {open !== null && photos[open] && (
        <div className="photo-gallery-lightbox" onClick={() => setOpen(null)} role="dialog" aria-modal="true" aria-label="Photo viewer">
          <button ref={closeRef} type="button" className="photo-gallery-lb-btn photo-gallery-lb-close" onClick={() => setOpen(null)} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          {photos.length > 1 && (
            <>
              <button type="button" className="photo-gallery-lb-btn photo-gallery-lb-prev" onClick={e => step(e, -1)} aria-label="Previous photo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button type="button" className="photo-gallery-lb-btn photo-gallery-lb-next" onClick={e => step(e, 1)} aria-label="Next photo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </>
          )}
          <div className="photo-gallery-lb-body" onClick={e => e.stopPropagation()}>
            <img src={photos[open].image_url} alt={altFor(photos[open])} />
            {photos[open].caption && <p className="photo-gallery-lb-caption">{photos[open].caption}</p>}
          </div>
          {photos.length > 1 && <div className="photo-gallery-lb-counter" aria-live="polite">{open + 1} / {photos.length}</div>}
        </div>
      )}
    </section>
  )
}

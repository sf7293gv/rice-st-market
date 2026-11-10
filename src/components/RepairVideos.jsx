// "Watch Our Repairs" — videos uploaded through Admin → Repair Media (repair_media rows with
// type 'video'), played with native <video> elements. The Repairs page passes them in (it already
// loads repair_media); photos stay in the Before & After section, so nothing shows twice.
// The heading, intro line and follow button are pre-rendered; videos render after hydration.
import { useState } from 'react'
import { useHydrated } from '../hooks/useHydrated'
import { TIKTOK_PROFILE_URL, TIKTOK_HANDLE } from '../lib/tiktok'
import { STORE_NAME } from '../lib/siteConfig'
import './RepairVideos.css'

const INITIAL_COUNT = 6

export default function RepairVideos({ videos = [], alt = false }) {
  const hydrated = useHydrated()
  const [showAll, setShowAll] = useState(false)

  const visible = showAll ? videos : videos.slice(0, INITIAL_COUNT)
  const showVideos = hydrated && videos.length > 0

  const followButton = (
    <a className="btn-primary repair-videos-follow" href={TIKTOK_PROFILE_URL} target="_blank" rel="noopener noreferrer">
      <TikTokIcon />
      Follow {TIKTOK_HANDLE} on TikTok
    </a>
  )

  return (
    <section className={`section${alt ? ' section-alt' : ''} repair-videos-section`}>
      <div className="container">
        <div className="section-header centered">
          <span className="section-eyebrow">On Video</span>
          <h2 className="section-title">Watch Our Repairs</h2>
          <p className="section-subtitle repair-videos-intro">
            See how we fix phones, screens and batteries. Real repairs at {STORE_NAME}, St. Paul.
          </p>
        </div>

        {showVideos ? (
          <>
            <div className="repair-videos-grid">
              {visible.map(v => (
                <figure key={v.id} className="repair-video">
                  <div className="repair-video-frame">
                    <video src={v.url} controls playsInline preload="metadata" aria-label={v.description || 'Repair video'} />
                  </div>
                  {v.description && <figcaption className="repair-video-title">{v.description}</figcaption>}
                </figure>
              ))}
            </div>
            <div className="repair-videos-actions">
              {videos.length > INITIAL_COUNT && !showAll && (
                <button type="button" className="btn-outline" onClick={() => setShowAll(true)}>
                  Show more videos ({videos.length - INITIAL_COUNT})
                </button>
              )}
              {followButton}
            </div>
          </>
        ) : (
          <div className="repair-videos-follow-card">
            <p>See our latest repairs on TikTok.</p>
            {followButton}
          </div>
        )}
      </div>
    </section>
  )
}

function TikTokIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.6 2.6 0 0 1-2.6-2.6 2.6 2.6 0 0 1 3.37-2.48V9.66a5.73 5.73 0 0 0-.77-.05A5.68 5.68 0 0 0 4.18 15.3 5.69 5.69 0 0 0 9.86 21a5.68 5.68 0 0 0 5.68-5.68V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.24-1.48z"/>
    </svg>
  )
}

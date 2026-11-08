// "Watch Our Repairs" — TikTok videos from the repair_videos table, shown with TikTok's iframe
// player (https://www.tiktok.com/player/v1/<videoId>). The heading, intro line and follow button
// are pre-rendered; players render only after hydration and load lazily as they near the
// viewport. Each player has a "Watch on TikTok" link in case it can't load for a visitor.
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useHydrated } from '../hooks/useHydrated'
import { parseTikTokUrl, TIKTOK_PROFILE_URL, TIKTOK_HANDLE } from '../lib/tiktok'
import { STORE_NAME } from '../lib/siteConfig'
import './RepairVideos.css'

const INITIAL_COUNT = 6

export default function RepairVideos({ alt = false }) {
  const hydrated = useHydrated()
  const [videos, setVideos] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    supabase
      .from('repair_videos')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('repair_videos fetch error:', error)
        // Skip any row that isn't a valid canonical TikTok video URL.
        if (data) setVideos(data.map(v => ({ ...v, parsed: parseTikTokUrl(v.tiktok_url) })).filter(v => !v.parsed.error))
        setLoaded(true)
      })
  }, [])

  const visible = showAll ? videos : videos.slice(0, INITIAL_COUNT)
  const showPlayers = hydrated && loaded && videos.length > 0

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
          <span className="section-eyebrow">On TikTok</span>
          <h2 className="section-title">Watch Our Repairs</h2>
          <p className="section-subtitle repair-videos-intro">
            See how we fix phones, screens and batteries. Real repairs at {STORE_NAME}, St. Paul.
          </p>
        </div>

        {showPlayers ? (
          <>
            <div className="repair-videos-grid">
              {visible.map(v => (
                <figure key={v.id} className="repair-video">
                  <div className="repair-video-frame">
                    <iframe
                      src={`https://www.tiktok.com/player/v1/${v.parsed.videoId}`}
                      title={v.title || 'Repair video'}
                      allow="fullscreen; autoplay"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                  {v.title && <figcaption className="repair-video-title">{v.title}</figcaption>}
                  <a className="repair-video-link" href={v.parsed.url} target="_blank" rel="noopener noreferrer">
                    Watch on TikTok
                  </a>
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

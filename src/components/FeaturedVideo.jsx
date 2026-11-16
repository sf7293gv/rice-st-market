// "See Rice St Market" — the featured home video (home_video row with placement 'featured',
// Admin → Home Video → Featured video). Starts from the build-time snapshot so the heading and
// intro line are in the pre-rendered HTML, with an empty 9:16 box reserving the player's space.
// The <video> itself renders only after hydration. Plays with sound when the visitor presses play
// (no autoplay). Hidden entirely when there's no active featured video.
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useHydrated } from '../hooks/useHydrated'
import { getPrerenderData } from '../lib/prerenderData'
import './FeaturedVideo.css'

export default function FeaturedVideo() {
  const hydrated = useHydrated()
  const [video, setVideo] = useState(() => getPrerenderData('featuredVideo') ?? null)

  useEffect(() => {
    supabase
      .from('home_video')
      .select('video_url, poster_url')
      .eq('placement', 'featured')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (error) { console.error('featured home_video fetch error:', error); return }
        setVideo(data?.[0] ?? null)
      })
  }, [])

  if (!video) return null

  return (
    <section className="section featured-video-section">
      <div className="container">
        <div className="section-header centered">
          <span className="section-eyebrow">Take a Look</span>
          <h2 className="section-title">See Rice St Market</h2>
          <p className="section-subtitle featured-video-intro">
            A quick tour of the shop, repairs, wireless plans and grocery at 1110 Rice St, St. Paul.
          </p>
        </div>
        <div className="featured-video-frame">
          {hydrated && (
            <video
              src={video.video_url}
              poster={video.poster_url ?? undefined}
              controls
              playsInline
              preload="metadata"
              aria-label="Video tour of Rice St Market"
            />
          )}
        </div>
      </div>
    </section>
  )
}

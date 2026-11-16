// Background video for the home hero, from the most recently updated active home_video row with
// placement 'hero' (Admin → Home Video → Hero background). Renders only after hydration, so the
// pre-rendered HTML and first paint are unchanged; the layer is absolutely positioned behind the
// hero content, so it can't shift layout. It fades in only once the video is actually playing (the hero gradient stays underneath).
// Visitors with reduced motion, Save-Data or a 2g connection get the poster (if any) instead,
// and the video file is never requested. Playback pauses when the hero is off-screen or the tab
// is hidden.
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useHydrated } from '../hooks/useHydrated'

// Whether this visitor should get a moving video (vs. just the poster).
function motionAllowed() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  const conn = navigator.connection
  if (conn?.saveData) return false
  if (['slow-2g', '2g'].includes(conn?.effectiveType)) return false
  return true
}

export default function HeroVideo() {
  const hydrated = useHydrated()
  const [media, setMedia] = useState(null)      // { videoUrl, posterUrl, playVideo }
  const [visible, setVisible] = useState(false) // layer faded in
  const layerRef = useRef(null)
  const videoRef = useRef(null)

  useEffect(() => {
    supabase
      .from('home_video')
      .select('video_url, poster_url')
      .eq('placement', 'hero')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (error) console.error('home_video fetch error:', error)
        const row = data?.[0]
        if (row) setMedia({ videoUrl: row.video_url, posterUrl: row.poster_url, playVideo: motionAllowed() })
      })
  }, [])

  // Play only while the hero is on screen and the tab is visible.
  useEffect(() => {
    const video = videoRef.current
    const layer = layerRef.current
    if (!video || !layer) return
    video.muted = true            // set as a property too: autoplay requires it, and React
    video.defaultMuted = true     // doesn't always reflect `muted` as an attribute
    let onScreen = false
    const sync = () => {
      if (onScreen && document.visibilityState === 'visible') video.play().catch(() => {})
      else video.pause()
    }
    const observer = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; sync() })
    observer.observe(layer)
    document.addEventListener('visibilitychange', sync)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [media])

  if (!hydrated || !media) return null
  if (!media.playVideo && !media.posterUrl) return null

  return (
    <div ref={layerRef} className={`hero-video${visible ? ' is-visible' : ''}`} aria-hidden="true">
      {media.playVideo ? (
        <video
          ref={videoRef}
          src={media.videoUrl}
          poster={media.posterUrl ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={() => setVisible(true)}
          onError={() => setVisible(false)}
        />
      ) : (
        <img src={media.posterUrl} alt="" onLoad={() => setVisible(true)} />
      )}
      <div className="hero-video-overlay" />
    </div>
  )
}

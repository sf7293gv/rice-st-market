// "Watch Our Repairs" — TikTok videos from the repair_videos table, using TikTok's official
// embed (blockquote + embed.js). The heading, intro line and follow button are pre-rendered;
// embeds render only after hydration, and embed.js loads only once the section is near the
// viewport. embed.js tags each blockquote with an id and later looks it up again, so each embed
// slot is an empty element React never manages: its markup is written once from an effect and
// never re-applied (re-applying it mid-load replaces the tagged node and the embed fails).
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useHydrated } from '../hooks/useHydrated'
import { parseTikTokUrl, TIKTOK_PROFILE_URL, TIKTOK_HANDLE } from '../lib/tiktok'
import { STORE_NAME } from '../lib/siteConfig'
import './RepairVideos.css'

const INITIAL_COUNT = 6
const EMBED_SCRIPT_ID = 'tiktok-embed-script'

const escapeAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function embedHtml({ url, user, videoId }) {
  return `<blockquote class="tiktok-embed" cite="${escapeAttr(url)}" data-video-id="${escapeAttr(videoId)}">` +
    `<section><a target="_blank" rel="noopener noreferrer" href="${escapeAttr(url)}">@${escapeAttr(user)} on TikTok</a></section>` +
    '</blockquote>'
}

// One embed slot. Child effects run before the parent's, so every slot is filled before the
// parent (re)runs embed.js.
function TikTokEmbed({ url, user, videoId }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (el.dataset.videoId === videoId) return
    el.dataset.videoId = videoId
    el.innerHTML = embedHtml({ url, user, videoId })
  }, [url, user, videoId])
  return <div ref={ref} className="repair-video-embed" />
}

// (Re)inserting embed.js makes TikTok scan the page for unprocessed blockquotes, which covers
// embeds added later by "Show more".
function runTikTokEmbed() {
  document.getElementById(EMBED_SCRIPT_ID)?.remove()
  const script = document.createElement('script')
  script.id = EMBED_SCRIPT_ID
  script.src = 'https://www.tiktok.com/embed.js'
  script.async = true
  document.body.appendChild(script)
}

export default function RepairVideos({ alt = false }) {
  const hydrated = useHydrated()
  const [videos, setVideos] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [nearViewport, setNearViewport] = useState(false)
  const sectionRef = useRef(null)

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

  // Flag the section once it comes within 400px of the viewport.
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNearViewport(true)
        observer.disconnect()
      }
    }, { rootMargin: '400px 0px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const visible = showAll ? videos : videos.slice(0, INITIAL_COUNT)
  const showEmbeds = hydrated && loaded && videos.length > 0
  const visibleKey = visible.map(v => v.id).join(',')

  // Load (or re-run) embed.js once the section is near the viewport and its embeds are in the DOM.
  useEffect(() => {
    if (showEmbeds && nearViewport && visibleKey) runTikTokEmbed()
  }, [showEmbeds, nearViewport, visibleKey])

  const followButton = (
    <a className="btn-primary repair-videos-follow" href={TIKTOK_PROFILE_URL} target="_blank" rel="noopener noreferrer">
      <TikTokIcon />
      Follow {TIKTOK_HANDLE} on TikTok
    </a>
  )

  return (
    <section ref={sectionRef} className={`section${alt ? ' section-alt' : ''} repair-videos-section`}>
      <div className="container">
        <div className="section-header centered">
          <span className="section-eyebrow">On TikTok</span>
          <h2 className="section-title">Watch Our Repairs</h2>
          <p className="section-subtitle repair-videos-intro">
            See how we fix phones, screens and batteries. Real repairs at {STORE_NAME}, St. Paul.
          </p>
        </div>

        {showEmbeds ? (
          <>
            <div className="repair-videos-grid">
              {visible.map(v => (
                <figure key={v.id} className="repair-video">
                  <TikTokEmbed {...v.parsed} />
                  {v.title && <figcaption className="repair-video-title">{v.title}</figcaption>}
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

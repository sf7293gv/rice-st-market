// TikTok video URL handling shared by the admin manager and the Repairs page embeds.

export const TIKTOK_PROFILE_URL = 'https://www.tiktok.com/@techbanzo'
export const TIKTOK_HANDLE = '@techbanzo'

const SHORT_LINK_HOSTS = ['vm.tiktok.com', 'vt.tiktok.com']
const VIDEO_PATH = /^\/@([A-Za-z0-9._]+)\/video\/(\d+)\/?$/

// Parses a pasted TikTok address into its canonical form (query string and hash removed).
// Returns { url, user, videoId } or { error }.
export function parseTikTokUrl(input) {
  let u
  try {
    u = new URL(String(input).trim())
  } catch {
    return { error: 'Enter a full TikTok video address starting with https://www.tiktok.com/' }
  }
  const host = u.hostname.toLowerCase()
  if (SHORT_LINK_HOSTS.includes(host)) {
    return { error: 'Open the video in your browser and paste the full address that contains /video/' }
  }
  const m = u.pathname.match(VIDEO_PATH)
  if (u.protocol !== 'https:' || !['www.tiktok.com', 'tiktok.com'].includes(host) || !m) {
    return { error: 'The address must look like https://www.tiktok.com/@username/video/1234567890' }
  }
  const [, user, videoId] = m
  return { url: `https://www.tiktok.com/@${user}/video/${videoId}`, user, videoId }
}

// Data fetched at build time for pre-rendered pages (see scripts/prerender.mjs).
// The server render reads it from setPrerenderData(); the browser reads the same JSON from
// window.__PRERENDER_DATA__, so the first client render matches the static HTML exactly
// and hydration doesn't mismatch. Pages still re-fetch live data after mounting.

let serverData = null

export function setPrerenderData(data) {
  serverData = data
}

export function getPrerenderData(key) {
  const data = typeof window === 'undefined' ? serverData : window.__PRERENDER_DATA__
  return data?.[key]
}

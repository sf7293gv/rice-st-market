// Build-time prerender (runs after `vite build` and the SSR build of src/entry-server.jsx).
// Writes static HTML for the public routes so crawlers that don't run JavaScript see real
// content; the browser then hydrates it (src/main.jsx). Admin pages and unknown paths keep
// using the untouched SPA shell, written to dist/spa.html.
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { loadEnv } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const ssrDir = resolve(root, 'dist-ssr')

// Each route is written to dist/<file> and must have a matching rewrite in vercel.json.
const ROUTES = [
  { path: '/',            file: 'index.html' },
  { path: '/about',       file: 'about.html' },
  { path: '/contact',     file: 'contact.html' },
  { path: '/plans',       file: 'plans.html' },
  { path: '/electronics', file: 'electronics.html' },
  { path: '/accessories', file: 'accessories.html' },
  { path: '/grocery',     file: 'grocery.html' },
  { path: '/deli',        file: 'deli.html' },
  { path: '/repairs',     file: 'repairs.html' },
  { path: '/services',    file: 'services.html' },
]

// Fail fast if vercel.json would send a pre-rendered route to the SPA shell instead.
const vercel = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'))
for (const r of ROUTES.filter(r => r.path !== '/')) {
  if (!vercel.rewrites?.some(w => w.source === r.path && w.destination === `/${r.file}`)) {
    throw new Error(`vercel.json is missing the rewrite { "source": "${r.path}", "destination": "/${r.file}" }`)
  }
}

// Public data baked into the HTML (carriers for the footer/Home/JSON-LD on every page, hours for
// the store JSON-LD, plans for /plans). A failed or slow fetch must not fail the build: pages then
// pre-render without it and the browser fetches it as usual.
async function fetchTable(table, order) {
  const env = loadEnv('production', root, 'VITE_')
  const url = `${env.VITE_SUPABASE_URL}/rest/v1/${table}?select=*${order ? `&order=${order}` : ''}`
  try {
    const res = await fetch(url, {
      headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn(`[prerender] Could not fetch ${table} (${err.message}); pages will pre-render without it.`)
    return undefined
  }
}

const [carriers, plans, hours] = await Promise.all([
  fetchTable('carriers', 'display_order.asc'),
  fetchTable('plans', 'display_order.asc'),
  fetchTable('hours'),
])
const buildYear = new Date().getFullYear()
const shared = { buildYear, carriers, hours }
const dataFor = path => (path === '/plans' ? { ...shared, plans } : shared)

const { render } = await import(pathToFileURL(resolve(ssrDir, 'entry-server.js')).href)
const template = readFileSync(resolve(dist, 'index.html'), 'utf8')

// The SPA shell keeps index.html's generic title/description for client-only pages.
writeFileSync(resolve(dist, 'spa.html'), template)

// React 19 emits hoisted <title>/<meta>/<link> tags at the start of renderToString's output.
const HEAD_TAG = /^(?:<title>[\s\S]*?<\/title>|<meta\b[^>]*>|<link\b[^>]*>)/
function splitHead(html) {
  let head = ''
  let m
  while ((m = html.match(HEAD_TAG))) {
    head += m[0]
    html = html.slice(m[0].length)
  }
  return { head, body: html }
}

const toJsonScript = data =>
  `<script>window.__PRERENDER_DATA__=${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`

for (const route of ROUTES) {
  const data = dataFor(route.path)
  const { head, body } = splitHead(render(route.path, data))
  if (!/<title>/.test(head) || !/name="description"/.test(head)) {
    throw new Error(`${route.path} rendered without its own <title> and meta description`)
  }
  const html = template
    // Replace the generic title/description so each page has exactly one of each.
    .replace(/<title>[\s\S]*?<\/title>\s*/, '')
    .replace(/<meta name="description"[^>]*>\s*/, '')
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>\n    ${toJsonScript(data)}`)
  writeFileSync(resolve(dist, route.file), html)
  console.log(`[prerender] ${route.path.padEnd(13)} → dist/${route.file}`)
}

rmSync(ssrDir, { recursive: true, force: true })

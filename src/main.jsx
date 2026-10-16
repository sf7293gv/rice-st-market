// Entry point — mounts the React app with HelmetProvider for per-page SEO meta tags.
// Pre-rendered pages (see scripts/prerender.mjs) arrive with markup in #root and are hydrated;
// the SPA shell (admin pages, unknown paths) arrives empty and is rendered from scratch.
import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Analytics } from '@vercel/analytics/react'
import './styles/global.css'
import App from './App.jsx'

const app = (
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <Analytics />
    </HelmetProvider>
  </StrictMode>
)

const root = document.getElementById('root')
if (root.hasChildNodes()) {
  hydrateRoot(root, app)
} else {
  createRoot(root).render(app)
}

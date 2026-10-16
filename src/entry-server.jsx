// Build-time render entry used by scripts/prerender.mjs — renders one route to an HTML string.
// Mirrors main.jsx's tree (minus Analytics, which renders nothing) with a StaticRouter so the
// browser's hydration render produces identical markup.
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.jsx'
import { setPrerenderData } from './lib/prerenderData'

export function render(url, data) {
  setPrerenderData(data)
  return renderToString(
    <StrictMode>
      <HelmetProvider>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </HelmetProvider>
    </StrictMode>,
  )
}

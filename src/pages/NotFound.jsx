// 404 page — catch-all route; noindex so search engines don't index the error page.
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { STORE_NAME } from '../lib/siteConfig'
import './NotFound.css'

export default function NotFound() {
  return (
    <div className="nf-page">
      <Helmet>
        <title>{`Page Not Found — ${STORE_NAME}`}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="nf-inner">

        {/* Logo */}
        <Link to="/" className="nf-logo" aria-label={`${STORE_NAME} — go home`}>
          <span className="nf-logo-unity">Rice St</span>
          <span className="nf-logo-foods">Market</span>
        </Link>

        {/* 404 number */}
        <div className="nf-code" aria-hidden="true">404</div>

        <h1 className="nf-title">Oops! Page not found.</h1>

        <p className="nf-sub">
          Looks like this page got eaten&nbsp;—&nbsp;or maybe it just needs a repair.
          <br />
          Either way, we can&rsquo;t find it from here.
        </p>

        <Link to="/" className="nf-btn">
          ← Go Back Home
        </Link>

        {/* Decorative links */}
        <div className="nf-links">
          <span>Or try one of these:</span>
          <nav aria-label="Helpful links">
            <Link to="/menu">Menu</Link>
            <Link to="/repairs">Repairs</Link>
            <Link to="/electronics">Electronics</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>

      </div>

      {/* Background decoration */}
      <div className="nf-bg-circle nf-bg-circle-1" aria-hidden="true" />
      <div className="nf-bg-circle nf-bg-circle-2" aria-hidden="true" />
    </div>
  )
}

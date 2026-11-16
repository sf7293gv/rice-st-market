// Shared shell for all public pages — Navbar, page content, Footer, and floating widgets
// (booking bar/pill, WhatsApp, back to top).
import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import WhatsAppButton from './WhatsAppButton'
import BackToTopButton from './BackToTopButton'
import BookingCTAs from './BookingCTAs'
import StoreJsonLd from './StoreJsonLd'

export default function Layout() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    // Skip scroll-to-top when navigating to a hash anchor (e.g. /repairs#booking)
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])

  return (
    <>
      <StoreJsonLd />
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
      <BookingCTAs />
      <WhatsAppButton />
      <BackToTopButton />
    </>
  )
}

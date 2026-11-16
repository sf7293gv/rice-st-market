// Link to the repair booking form (/repairs#booking). On /repairs itself the hash may already be
// #booking, so navigating wouldn't scroll; there it scrolls straight to the form instead.
import { Link, useLocation, useNavigate } from 'react-router-dom'

export const BOOKING_PATH = '/repairs#booking'

export default function BookLink({ onClick, children, ...props }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  function handleClick(e) {
    onClick?.(e)
    if (pathname !== '/repairs') return
    const form = document.getElementById('booking')
    if (!form) return
    e.preventDefault()
    navigate(BOOKING_PATH, { replace: true })
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <Link to={BOOKING_PATH} onClick={handleClick} {...props}>
      {children}
    </Link>
  )
}

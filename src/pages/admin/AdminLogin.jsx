import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { STORE_NAME } from '../../lib/siteConfig'
import '../../styles/admin.css'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/admin', { replace: true })
    })
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
    } else {
      navigate('/admin', { replace: true })
    }
  }

  return (
    <div className="adm-login-wrap">
      <div className="adm-login-card">
        <div className="adm-login-logo">
          <div className="adm-login-logotype">Rice St <em>Market</em></div>
          <div className="adm-login-badge">Admin Panel</div>
        </div>

        {error && <div className="adm-login-error">{error}</div>}

        <form className="adm-login-form" onSubmit={handleSubmit} noValidate>
          <div className="adm-login-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="adm-login-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="adm-login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="adm-login-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="adm-login-submit"
            disabled={loading || !email || !password}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="adm-login-back">
          <Link to="/">← Back to {STORE_NAME} website</Link>
        </p>
      </div>
    </div>
  )
}

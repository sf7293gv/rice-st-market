// Blocks unauthenticated access to admin routes; renders null while the auth check is in flight
// to avoid a flash of the login redirect before the session resolves.
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // undefined = still loading; null = no session
  if (session === undefined) return null
  if (!session) return <Navigate to="/admin/login" replace />
  return children
}

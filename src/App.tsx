import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { DailyTracking } from './pages/DailyTracking'
import { Settings } from './pages/Settings'
import { WeeklyView } from './pages/WeeklyView'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

function RequireAuth({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasLastUser, setHasLastUser] = useState<boolean>(!!localStorage.getItem('pana_last_user_id'))

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        setHasLastUser(true)
        localStorage.setItem('pana_last_user_id', session.user.id)
      }
      if (session || !window.location.hash.includes('access_token=')) {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        setLoading(false)
        setHasLastUser(true)
        localStorage.setItem('pana_last_user_id', session.user.id)
      }
    })

    const timer = setTimeout(() => {
      setLoading(p => p ? false : p)
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  // If we have a session, we're good.
  // If we're offline but have a last user ID, we allow access (ReadOnly mode will be handled in pages)
  const isOffline = !navigator.onLine
  const canProceedOffline = isOffline && hasLastUser

  if (!session && !canProceedOffline) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter basename="/pana">
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<RequireAuth><DailyTracking /></RequireAuth>} />
        <Route path="/weekly" element={<RequireAuth><WeeklyView /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

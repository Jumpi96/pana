import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Loader2, Mail, KeyRound, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  // If user is already logged in, send them home
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/')
    })
  }, [navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      // Try to sign in first
      const { error: signInError, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      // If user doesn't exist, sign them up
      if (signInError?.message.includes('Invalid login credentials')) {
        const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) throw signUpError

        if (signUpData.session) {
          navigate('/')
        } else {
          alert('Account created! Please log in.')
        }
      } else if (signInError) {
        throw signInError
      } else if (data.session) {
        navigate('/')
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4 font-sans">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800">
        <div className="text-center mb-8">
          <span className="text-4xl">🥗</span>
          <h1 className="text-2xl font-bold mt-4">Welcome to Pana</h1>
          <p className="text-gray-500 text-sm mt-2">Macro Tracker</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-zinc-800/50 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-zinc-800/50 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                Sign In / Sign Up
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </>
            )}
          </button>
          <p className="text-xs text-center text-gray-500 mt-4">
            First time? Just enter email + password to create account
          </p>
        </form>
      </div>
    </div>
  )
}

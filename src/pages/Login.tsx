import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Loader2, Mail, KeyRound, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function Login() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [view, setView] = useState<'email' | 'token'>('email')
  const navigate = useNavigate()

  // If user is already logged in, send them home
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/')
    })
  }, [navigate])

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: window.location.origin + import.meta.env.BASE_URL
        }
      })
      if (error) throw error
      setView('token')
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'An error occurred'
      alert(message === "Signups not allowed for this instance" ? "Access denied: User not found." : message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const { error, data } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email'
      })
      if (error) throw error

      // If data.session exists, we are logged in
      if (data.session) {
        navigate('/')
      }
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 p-6 font-sans transition-colors">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md p-10 rounded-[32px] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.05)] border-[4px] border-black dark:border-zinc-800 transition-all hover:scale-[1.01]">
        <div className="text-center mb-10">
          <div className="inline-block text-6xl mb-6 animate-bounce-subtle rotate-6">🥗</div>
          <h1 className="text-4xl font-[900] tracking-tighter italic uppercase text-black dark:text-white leading-none">
            Pana<span className="text-green-500">!</span>
          </h1>
          <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mt-3">The Dorky Macro Tracker</p>
        </div>

        {view === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest pl-2">Your Email Boss</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20 dark:text-white/20 group-focus-within:text-green-500 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-[3px] border-black dark:border-zinc-700 dark:bg-zinc-800 bg-white font-black italic tracking-tight focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                  placeholder="you@email.com"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[6px_6px_0px_0px_rgba(34,197,94,1)] disabled:opacity-50 text-lg flex items-center justify-center gap-3 group"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  Send Magic Code
                  <span className="group-hover:translate-x-1 transition-transform">🚀</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-8">
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setView('email')}
                className="text-[10px] font-black uppercase tracking-widest text-green-600 flex items-center gap-1 hover:underline mb-4"
              >
                <ChevronLeft className="w-4 h-4" /> Wait, wrong email!
              </button>
              <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest pl-2">The Secret 6-Digit Code</label>
              <div className="relative group">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20 dark:text-white/20 group-focus-within:text-green-500 transition-colors" />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  className="w-full pl-12 pr-4 py-5 rounded-2xl border-[3px] border-black dark:border-zinc-700 dark:bg-zinc-800 bg-white text-3xl tracking-[0.4em] font-black italic text-center focus:ring-4 focus:ring-green-500/10 outline-none transition-all placeholder:opacity-20"
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              <p className="text-[10px] font-bold text-center text-gray-400 uppercase tracking-widest mt-4">
                Sent with luv to <span className="text-black dark:text-white underline decoration-green-500 decoration-2">{email}</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || token.length < 6}
              className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[6px_6px_0px_0px_rgba(34,197,94,1)] disabled:opacity-50 text-lg flex items-center justify-center gap-3"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Let's Go! 🥑"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

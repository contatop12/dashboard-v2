import { useState } from 'react'
import { Zap } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-brand rounded-lg flex items-center justify-center">
            <Zap size={22} className="text-[#0F0F0F]" fill="currentColor" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-white tracking-tight">P12 Dashboard</h1>
            <p className="text-[11px] text-muted-foreground font-sans">Entre com sua conta</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full bg-surface-card border border-surface-border rounded-xl p-6 flex flex-col gap-4 shadow-lg"
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="login-email" className="text-[11px] uppercase tracking-wider text-muted-foreground font-sans">
              E-mail
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-surface-input border border-surface-border rounded-md px-4 py-2 text-sm text-white focus:outline-none focus:border-brand/50 font-sans"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="login-password" className="text-[11px] uppercase tracking-wider text-muted-foreground font-sans">
              Senha
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-surface-input border border-surface-border rounded-md px-4 py-2 text-sm text-white focus:outline-none focus:border-brand/50 font-sans"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 font-sans bg-red-500/10 border border-red-500/20 rounded-md px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 bg-brand text-[#0F0F0F] text-sm font-semibold py-2 rounded-md hover:bg-brand/90 transition-colors disabled:opacity-60 font-sans"
          >
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

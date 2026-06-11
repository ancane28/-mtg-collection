'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signup } from './actions'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value
    if (password !== confirm) {
      setError('Le password non coincidono')
      return
    }
    setLoading(true)
    setError(null)
    const result = await signup(new FormData(form))
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-9 h-9 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-orange-900/40">
            M
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">MTG Collection</h1>
            <p className="text-gray-500 text-xs">Manager</p>
          </div>
        </div>

        {success ? (
          <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-900/40 border border-green-800/60 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-semibold mb-1">Account creato!</h2>
              <p className="text-gray-400 text-sm">
                Abbiamo inviato un link di conferma alla tua email.
                <strong className="text-gray-200"> Devi cliccare il link</strong> prima di poter accedere.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-block w-full text-center bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg py-2 transition-colors"
            >
              Vai al login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-6 space-y-4">
            <h2 className="text-white font-semibold text-base">Crea account</h2>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Email</label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full bg-gray-800/80 border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/60"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Password</label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full bg-gray-800/80 border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/60"
              />
              <p className="text-[10px] text-gray-600">Minimo 6 caratteri</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Conferma password</label>
              <input
                name="confirm"
                type="password"
                required
                autoComplete="new-password"
                className="w-full bg-gray-800/80 border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/60"
              />
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors"
            >
              {loading ? 'Creazione in corso...' : 'Crea account'}
            </button>

            <p className="text-center text-xs text-gray-500">
              Hai già un account?{' '}
              <Link href="/login" className="text-orange-400 hover:text-orange-300">
                Accedi
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

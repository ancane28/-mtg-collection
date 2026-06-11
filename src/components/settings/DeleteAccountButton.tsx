'use client'

import { useState } from 'react'
import { deleteAccount } from '@/app/(app)/settings/actions'

export function DeleteAccountButton() {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    const result = await deleteAccount()
    if (result?.error) {
      setError(result.error)
      setLoading(false)
      setConfirm(false)
    }
  }

  if (confirm) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-300">
          Sei sicuro? Questa azione è <strong>irreversibile</strong>: collezione, mazzi e wishlist verranno eliminati permanentemente.
        </p>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white transition-colors"
          >
            {loading ? 'Eliminazione...' : 'Sì, elimina account'}
          </button>
          <button
            onClick={() => setConfirm(false)}
            disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            Annulla
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 border border-red-900/60 hover:bg-red-900/20 hover:text-red-300 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      Elimina account
    </button>
  )
}

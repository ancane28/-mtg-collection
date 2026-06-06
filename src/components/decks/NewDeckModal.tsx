'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { createDeck } from '@/app/(app)/decks/actions'

const FORMATS = [
  { value: 'commander', label: 'Commander' },
  { value: 'standard',  label: 'Standard' },
  { value: 'modern',    label: 'Modern' },
  { value: 'legacy',    label: 'Legacy' },
  { value: 'vintage',   label: 'Vintage' },
  { value: 'pauper',    label: 'Pauper' },
  { value: 'custom',    label: 'Custom' },
]

interface NewDeckModalProps {
  open: boolean
  onClose: () => void
}

export function NewDeckModal({ open, onClose }: NewDeckModalProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [format, setFormat] = useState('commander')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    const result = await createDeck(name.trim(), format)
    setLoading(false)
    if ('error' in result) {
      setError(result.error ?? 'Errore sconosciuto')
      return
    }
    setName('')
    setFormat('commander')
    onClose()
    router.push(`/decks/${result.id}`)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-white mb-5">Nuovo mazzo</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nome *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Grixis Control"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Formato</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            >
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
              Annulla
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              loading={loading}
              disabled={!name.trim()}
            >
              Crea mazzo
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

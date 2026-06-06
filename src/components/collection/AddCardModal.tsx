'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { autocompleteCardName } from '@/lib/scryfall/api'
import { addCardToCollection } from '@/app/(app)/collection/actions'

interface AddCardModalProps {
  open: boolean
  onClose: () => void
}

export function AddCardModal({ open, onClose }: AddCardModalProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (selected || query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    const timer = setTimeout(async () => {
      const results = await autocompleteCardName(query)
      setSuggestions(results.slice(0, 8))
      setShowSuggestions(results.length > 0)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, selected])

  function selectCard(name: string) {
    setSelected(name)
    setQuery(name)
    setShowSuggestions(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setLoading(true)
    setError(null)
    const result = await addCardToCollection(selected, qty)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      handleClose()
    }
  }

  function handleClose() {
    setQuery('')
    setSelected(null)
    setSuggestions([])
    setShowSuggestions(false)
    setQty(1)
    setError(null)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={handleClose} />
      <div className="relative z-10 bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-4">Aggiungi carta</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="block text-xs text-gray-400 mb-1">Nome carta</label>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(null) }}
              placeholder="Es: Lightning Bolt"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            {showSuggestions && (
              <ul className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-xl">
                {suggestions.map(name => (
                  <li
                    key={name}
                    onMouseDown={() => selectCard(name)}
                    className="px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 cursor-pointer"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Quantità</label>
            <input
              type="number"
              min={1}
              max={99}
              value={qty}
              onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>Annulla</Button>
            <Button type="submit" variant="primary" loading={loading} disabled={!selected}>
              Aggiungi
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { addCardToDeck } from '@/app/(app)/decks/actions'

interface AddCardToDeckModalProps {
  open: boolean
  deckId: string
  onClose: () => void
}

export function AddCardToDeckModal({ open, deckId, onClose }: AddCardToDeckModalProps) {
  const router = useRouter()
  const [cardName, setCardName] = useState('')
  const [qty, setQty] = useState(1)
  const [usageType, setUsageType] = useState<'real' | 'proxy'>('real')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    if (cardName.length < 2) { setSuggestions([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(cardName)}`
        )
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.data?.slice(0, 6) ?? [])
          setShowSuggestions(true)
        }
      } catch { /* ignora errori autocomplete */ }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [cardName])

  async function handleAdd() {
    if (!cardName.trim()) return
    setLoading(true)
    setError(null)
    const res = await addCardToDeck(deckId, cardName.trim(), qty, usageType)
    setLoading(false)
    if ('error' in res) { setError(res.error ?? 'Errore'); return }
    router.refresh()
    handleClose()
  }

  function handleClose() {
    setCardName('')
    setQty(1)
    setSuggestions([])
    setShowSuggestions(false)
    setError(null)
    onClose()
  }

  function selectSuggestion(name: string) {
    setCardName(name)
    setSuggestions([])
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-white mb-5">Aggiungi carta al mazzo</h2>

        {/* Nome carta con autocomplete */}
        <div className="relative mb-4">
          <label className="block text-sm text-gray-400 mb-1">Nome carta</label>
          <input
            ref={inputRef}
            type="text"
            value={cardName}
            onChange={(e) => { setCardName(e.target.value); setError(null) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { setShowSuggestions(false); handleAdd() }
              if (e.key === 'Escape') handleClose()
            }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="es. Sol Ring"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-xl">
              {suggestions.map((s) => (
                <button
                  key={s}
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                  onMouseDown={() => selectSuggestion(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quantità + tipo */}
        <div className="flex gap-3 mb-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Quantità</label>
            <input
              type="number"
              min={1}
              max={99}
              value={qty}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Tipo</label>
            <div className="flex h-[38px]">
              <button
                onClick={() => setUsageType('real')}
                className={`flex-1 text-sm font-medium rounded-l-lg border transition-colors ${
                  usageType === 'real'
                    ? 'bg-green-900/60 border-green-700 text-green-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                }`}
              >
                REAL
              </button>
              <button
                onClick={() => setUsageType('proxy')}
                className={`flex-1 text-sm font-medium rounded-r-lg border-t border-b border-r transition-colors ${
                  usageType === 'proxy'
                    ? 'bg-red-900/60 border-red-700 text-red-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                }`}
              >
                PROXY
              </button>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={handleClose}>Annulla</Button>
          <Button
            variant="primary"
            className="flex-1"
            loading={loading}
            onClick={handleAdd}
            disabled={!cardName.trim()}
          >
            Aggiungi
          </Button>
        </div>
      </div>
    </div>
  )
}

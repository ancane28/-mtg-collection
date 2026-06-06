'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { removeCardFromDeck, updateDeckCardQty } from '@/app/(app)/decks/actions'

interface DeckCardActionsProps {
  deckCardId: string
  currentQty: number
}

export function DeckCardActions({ deckCardId, currentQty }: DeckCardActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function run(fn: () => Promise<unknown>) {
    setLoading(true)
    await fn()
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ml-1">
      {/* − una copia */}
      <button
        onClick={() => run(() => updateDeckCardQty(deckCardId, currentQty - 1))}
        disabled={loading}
        title="Rimuovi 1 copia"
        className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-yellow-400 hover:bg-yellow-900/20 disabled:opacity-30 text-base leading-none"
      >
        −
      </button>

      {/* + una copia */}
      <button
        onClick={() => run(() => updateDeckCardQty(deckCardId, currentQty + 1))}
        disabled={loading}
        title="Aggiungi 1 copia"
        className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-green-400 hover:bg-green-900/20 disabled:opacity-30 text-base leading-none"
      >
        +
      </button>

      {/* ✕ rimuovi tutto */}
      <button
        onClick={() => run(() => removeCardFromDeck(deckCardId))}
        disabled={loading}
        title="Rimuovi dal mazzo"
        className="w-6 h-6 flex items-center justify-center rounded text-gray-600 hover:text-red-400 hover:bg-red-900/20 disabled:opacity-30"
      >
        {loading ? (
          <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>
    </div>
  )
}

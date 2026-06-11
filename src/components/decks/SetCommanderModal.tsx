'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { setDeckCommander } from '@/app/(app)/decks/actions'
import { Card } from '@/types/database'

interface DeckCardRow {
  id: string
  card: Card
}

interface SetCommanderModalProps {
  open: boolean
  deckId: string
  currentCommanderId: string | null
  deckCards: DeckCardRow[]
  onClose: () => void
}

function isLegendary(card: Card) {
  return card.type_line?.toLowerCase().includes('legendary') ?? false
}

export function SetCommanderModal({ open, deckId, currentCommanderId, deckCards, onClose }: SetCommanderModalProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  const sorted = useMemo(() => {
    // Carte leggendarie prima, poi le altre
    return [...deckCards].sort((a, b) => {
      const aLeg = isLegendary(a.card)
      const bLeg = isLegendary(b.card)
      if (aLeg && !bLeg) return -1
      if (!aLeg && bLeg) return 1
      return (a.card.name_en ?? '').localeCompare(b.card.name_en ?? '')
    })
  }, [deckCards])

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted
    const q = search.trim().toLowerCase()
    return sorted.filter((r) => r.card.name_en?.toLowerCase().includes(q))
  }, [sorted, search])

  async function handleSelect(cardId: string | null) {
    setSaving(cardId ?? 'none')
    await setDeckCommander(deckId, cardId)
    router.refresh()
    setSaving(null)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col gap-4 p-6 max-h-[80vh]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Imposta comandante</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Ricerca */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Cerca carta…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800/80 border border-gray-700/60 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
            autoFocus
          />
        </div>

        {/* Lista carte */}
        <div className="overflow-y-auto flex-1 -mx-2">
          {/* Opzione: rimuovi comandante */}
          {currentCommanderId && (
            <button
              onClick={() => handleSelect(null)}
              disabled={saving !== null}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50 mx-2"
              style={{ width: 'calc(100% - 1rem)' }}
            >
              <span className="w-8 h-11 rounded shrink-0 bg-gray-800 flex items-center justify-center text-gray-600">✕</span>
              <span>Rimuovi comandante</span>
            </button>
          )}

          {filtered.length === 0 ? (
            <p className="text-center py-6 text-gray-500 text-sm">Nessuna carta trovata</p>
          ) : (
            filtered.map((row) => {
              const isCurrent = row.card.id === currentCommanderId
              const legendary = isLegendary(row.card)
              const isSaving = saving === row.card.id

              return (
                <button
                  key={row.id}
                  onClick={() => handleSelect(row.card.id)}
                  disabled={saving !== null || isCurrent}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 mx-2 text-left ${
                    isCurrent
                      ? 'bg-orange-900/30 border border-orange-700/50'
                      : 'hover:bg-gray-800'
                  }`}
                  style={{ width: 'calc(100% - 1rem)' }}
                >
                  {row.card.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.card.image_url}
                      alt={row.card.name_en}
                      className="w-8 h-11 object-cover rounded shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-11 rounded bg-gray-800 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{row.card.name_en}</div>
                    <div className="text-xs text-gray-500 truncate">{row.card.type_line}</div>
                  </div>
                  {legendary && (
                    <span className="text-xs text-yellow-500 shrink-0">★</span>
                  )}
                  {isCurrent && (
                    <span className="text-xs text-orange-400 shrink-0">attuale</span>
                  )}
                  {isSaving && (
                    <svg className="animate-spin w-4 h-4 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

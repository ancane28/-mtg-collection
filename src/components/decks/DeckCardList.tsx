'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { DeckCardActions } from './DeckCardActions'
import { toggleDeckCardType } from '@/app/(app)/decks/actions'
import { Card } from '@/types/database'

const TYPE_ORDER = [
  'Commander', 'Planeswalker', 'Creature', 'Instant',
  'Sorcery', 'Artifact', 'Enchantment', 'Land', 'Other',
]

function getTypeGroup(typeLine: string | null): string {
  if (!typeLine) return 'Other'
  const t = typeLine.toLowerCase()
  if (t.includes('land'))         return 'Land'
  if (t.includes('creature'))     return 'Creature'
  if (t.includes('planeswalker')) return 'Planeswalker'
  if (t.includes('instant'))      return 'Instant'
  if (t.includes('sorcery'))      return 'Sorcery'
  if (t.includes('artifact'))     return 'Artifact'
  if (t.includes('enchantment'))  return 'Enchantment'
  return 'Other'
}

interface DeckCardRow {
  id: string
  quantity: number
  usage_type: 'real' | 'proxy'
  card: Card
}

interface DeckCardListProps {
  deckCards: DeckCardRow[]
  availabilityMap: Record<string, number>
}

export function DeckCardList({ deckCards, availabilityMap }: DeckCardListProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)
  const [toggleError, setToggleError] = useState<{ id: string; msg: string } | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return deckCards
    const q = search.trim().toLowerCase()
    return deckCards.filter((r) => r.card?.name_en?.toLowerCase().includes(q))
  }, [deckCards, search])

  const grouped = useMemo(() => {
    const g: Record<string, DeckCardRow[]> = {}
    for (const row of filtered) {
      const group = getTypeGroup(row.card?.type_line ?? null)
      if (!g[group]) g[group] = []
      g[group].push(row)
    }
    return g
  }, [filtered])

  async function handleToggle(row: DeckCardRow) {
    const newType = row.usage_type === 'real' ? 'proxy' : 'real'

    // Controllo client-side anticipato
    if (newType === 'real') {
      const available = availabilityMap[row.card?.oracle_id] ?? 0
      if (available < row.quantity) {
        setToggleError({
          id: row.id,
          msg: `Solo ${available} cop${available === 1 ? 'ia disponibile' : 'ie disponibili'}`,
        })
        setTimeout(() => setToggleError(null), 3000)
        return
      }
    }

    setToggling(row.id)
    setToggleError(null)
    const res = await toggleDeckCardType(row.id, newType)
    if (res.error) {
      setToggleError({ id: row.id, msg: res.error })
      setTimeout(() => setToggleError(null), 3000)
    } else {
      router.refresh()
    }
    setToggling(null)
  }

  return (
    <div>
      {/* Barra di ricerca */}
      <div className="mb-4 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          placeholder="Cerca carta nel mazzo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-500 text-sm">
          Nessuna carta corrisponde a &ldquo;{search}&rdquo;.
        </div>
      ) : (
        <div className="space-y-6">
          {TYPE_ORDER.filter((type) => grouped[type]?.length).map((type) => (
            <div key={type}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {type} ({grouped[type].reduce((s, r) => s + r.quantity, 0)})
              </h3>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {grouped[type].map((row, idx) => {
                  const isReal = row.usage_type === 'real'
                  const available = availabilityMap[row.card?.oracle_id] ?? 0
                  const canSwitchToReal = available >= row.quantity
                  const isToggling = toggling === row.id
                  const error = toggleError?.id === row.id ? toggleError.msg : null

                  return (
                    <div
                      key={row.id}
                      className={`group flex items-center gap-3 px-4 py-2.5 ${
                        idx < grouped[type].length - 1 ? 'border-b border-gray-800/50' : ''
                      } hover:bg-gray-800/40 transition-colors`}
                    >
                      <span className="text-sm text-gray-400 w-5 text-right shrink-0">{row.quantity}x</span>
                      <span className="flex-1 text-sm text-white">{row.card?.name_en}</span>

                      {/* Errore inline */}
                      {error && (
                        <span className="text-xs text-red-400">{error}</span>
                      )}

                      {/* Badge toggle */}
                      <button
                        onClick={() => handleToggle(row)}
                        disabled={isToggling || (!isReal && !canSwitchToReal)}
                        title={
                          isReal
                            ? 'Clicca per passare a PROXY'
                            : canSwitchToReal
                              ? 'Clicca per passare a REAL'
                              : `Solo ${available} cop${available === 1 ? 'ia disponibile' : 'ie disponibili'} in collezione`
                        }
                        className={`
                          px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide border transition-all
                          ${isToggling ? 'opacity-50 cursor-wait' : ''}
                          ${isReal
                            ? 'bg-green-900/40 text-green-400 border-green-700 hover:bg-red-900/30 hover:text-red-400 hover:border-red-700'
                            : canSwitchToReal
                              ? 'bg-yellow-900/30 text-yellow-500 border-yellow-700 hover:bg-green-900/30 hover:text-green-400 hover:border-green-700'
                              : 'bg-yellow-900/20 text-yellow-600 border-yellow-800 opacity-50 cursor-not-allowed'
                          }
                        `}
                      >
                        {isReal ? 'REAL' : 'PROXY'}
                      </button>

                      <DeckCardActions deckCardId={row.id} currentQty={row.quantity} />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

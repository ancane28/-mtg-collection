'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { NewDeckModal } from './NewDeckModal'
import { Deck } from '@/types/database'

const FORMAT_LABELS: Record<string, string> = {
  commander: 'Commander',
  standard:  'Standard',
  modern:    'Modern',
  legacy:    'Legacy',
  vintage:   'Vintage',
  pauper:    'Pauper',
  custom:    'Custom',
}

interface DeckRow extends Deck {
  commander: { name_en: string; image_url: string | null } | null
  stats: { real: number; proxy: number }
}

interface DecksPageClientProps {
  decks: DeckRow[]
}

export function DecksPageClient({ decks }: DecksPageClientProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? decks.filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.commander?.name_en ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : decks

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Mazzi</h1>
          <p className="text-sm text-gray-400 mt-1">
            {filtered.length !== decks.length ? `${filtered.length} / ${decks.length} mazzi` : `${decks.length} mazzi`}
          </p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          + Nuovo mazzo
        </Button>
      </div>

      {/* Barra di ricerca */}
      {decks.length > 0 && (
        <div className="mb-6 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Cerca per nome mazzo o comandante…"
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
      )}

      {decks.length > 0 ? (
        filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p>Nessun mazzo corrisponde a &ldquo;{search}&rdquo;.</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((deck) => {
            const { real, proxy } = deck.stats
            const total = real + proxy
            const healthPct = total > 0 ? Math.round((real / total) * 100) : 0

            return (
              <Link key={deck.id} href={`/decks/${deck.id}`}>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 hover:bg-gray-900/80 transition-all cursor-pointer group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                        {deck.name}
                      </h3>
                      {deck.format && (
                        <span className="text-xs text-purple-400 mt-0.5 block">
                          {FORMAT_LABELS[deck.format] ?? deck.format}
                        </span>
                      )}
                    </div>
                    {deck.commander?.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={deck.commander.image_url}
                        alt={deck.commander.name_en}
                        className="w-10 h-14 object-cover rounded ml-3 shrink-0"
                      />
                    )}
                  </div>

                  {deck.commander && (
                    <p className="text-xs text-gray-500 mb-3 truncate">
                      Comandante: <span className="text-gray-300">{deck.commander.name_en}</span>
                    </p>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="real">REAL {real}</Badge>
                    <Badge variant="proxy">PROXY {proxy}</Badge>
                    <span className="text-xs text-gray-500 ml-auto">{total} carte</span>
                  </div>

                  {total > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Salute mazzo</span>
                        <span>{healthPct}% REAL</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-700 rounded-full transition-all"
                          style={{ width: `${healthPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">Nessun mazzo ancora</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm">
            Crea il tuo primo mazzo e importa una decklist
          </p>
          <Button variant="primary" onClick={() => setModalOpen(true)}>+ Nuovo mazzo</Button>
        </div>
      )}

      <NewDeckModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}

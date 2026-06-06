'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'

type Stats = {
  totalCards: number
  uniqueCards: number
  totalDecks: number
  totalValue: number
  rarityCount: { mythic: number; rare: number; uncommon: number; common: number }
}

type DeckWithStats = {
  id: string
  name: string
  format: string | null
  commander: { name_en: string; image_url: string | null } | null
  stats: { real: number; proxy: number }
}

type OvercommitCard = {
  qty_available: number
}

interface Props {
  stats: Stats
  overcommitCards: OvercommitCard[]
  decks: DeckWithStats[]
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

const RARITY_CONFIG = [
  { key: 'mythic',   label: 'Mythic',   color: 'bg-orange-500' },
  { key: 'rare',     label: 'Rare',     color: 'bg-yellow-500' },
  { key: 'uncommon', label: 'Uncommon', color: 'bg-gray-400'   },
  { key: 'common',   label: 'Common',   color: 'bg-gray-600'   },
] as const

const FORMAT_LABELS: Record<string, string> = {
  commander: 'Commander',
  standard:  'Standard',
  modern:    'Modern',
  legacy:    'Legacy',
  vintage:   'Vintage',
  pauper:    'Pauper',
  custom:    'Custom',
}

export function DashboardClient({ stats, overcommitCards, decks }: Props) {
  const { totalCards, uniqueCards, totalDecks, totalValue, rarityCount } = stats
  const rarityTotal = Object.values(rarityCount).reduce((a, b) => a + b, 0)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Panoramica della tua collezione</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Carte totali" value={totalCards.toLocaleString('it-IT')} sub="copie fisiche" />
        <StatCard label="Carte uniche" value={uniqueCards.toLocaleString('it-IT')} sub="oracle id distinti" />
        <StatCard label="Mazzi" value={totalDecks.toLocaleString('it-IT')} />
        <StatCard
          label="Valore collezione"
          value={`€ ${totalValue.toFixed(2)}`}
          sub="prezzi Scryfall"
        />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Rarity distribution */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Distribuzione rarità</h2>
          <div className="space-y-3">
            {RARITY_CONFIG.map(({ key, label, color }) => {
              const count = rarityCount[key]
              const pct = rarityTotal > 0 ? (count / rarityTotal) * 100 : 0
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{label}</span>
                    <span>{count.toLocaleString('it-IT')}</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Overcommit alert */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300">Overcommit</h2>
            {overcommitCards.length > 0 && (
              <Badge variant="overcommit">{overcommitCards.length}</Badge>
            )}
          </div>
          {overcommitCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-20 text-center">
              <span className="text-2xl mb-1">✓</span>
              <p className="text-sm text-gray-500">Nessuna carta in overcommit</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-orange-300 mb-3">
                {overcommitCards.length} {overcommitCards.length === 1 ? 'carta usa' : 'carte usano'} più copie di quelle possedute.
              </p>
              <Link
                href="/collection"
                className="inline-flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 underline underline-offset-2"
              >
                Vai alla collezione per verificare
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Decks list */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-300">I tuoi mazzi</h2>
          <Link href="/decks" className="text-xs text-purple-400 hover:text-purple-300">
            Vai ai mazzi →
          </Link>
        </div>

        {decks.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">Nessun mazzo creato.</p>
        ) : (
          <div className="space-y-2">
            {decks.map((deck) => {
              const total = deck.stats.real + deck.stats.proxy
              const proxyPct = total > 0 ? (deck.stats.proxy / total) * 100 : 0
              return (
                <Link
                  key={deck.id}
                  href={`/decks/${deck.id}`}
                  className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-100 truncate group-hover:text-white">
                      {deck.name}
                    </p>
                    {deck.commander && (
                      <p className="text-xs text-gray-500 truncate">{deck.commander.name_en}</p>
                    )}
                  </div>

                  {deck.format && (
                    <span className="text-xs text-gray-500 shrink-0">
                      {FORMAT_LABELS[deck.format] ?? deck.format}
                    </span>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="real">{deck.stats.real} real</Badge>
                    {deck.stats.proxy > 0 && (
                      <Badge variant="proxy">{deck.stats.proxy} proxy</Badge>
                    )}
                  </div>

                  {total > 0 && (
                    <div className="w-20 shrink-0">
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${proxyPct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-600 mt-0.5 text-right">
                        {total} carte
                      </p>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

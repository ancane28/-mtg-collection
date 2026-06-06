import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export const dynamic = 'force-dynamic'

type DeckRaw = {
  id: string
  name: string
  format: string | null
  commander_card_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  commander: { name_en: string; image_url: string | null } | null
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ data: collection }, { data: decksRaw }] = await Promise.all([
    supabase.from('collection_availability').select('quantity_owned, qty_available, price_eur, rarity'),
    supabase
      .from('decks')
      .select('*, commander:commander_card_id(name_en, image_url)')
      .order('created_at', { ascending: false }),
  ])

  const decks = (decksRaw ?? []) as unknown as DeckRaw[]
  const deckIds = decks.map((d) => d.id)

  const { data: deckStatsRaw } = deckIds.length
    ? await supabase
        .from('deck_cards')
        .select('deck_id, usage_type, quantity')
        .in('deck_id', deckIds)
    : { data: null }

  const items = collection ?? []

  const totalCards = items.reduce((sum, i) => sum + i.quantity_owned, 0)
  const uniqueCards = items.length
  const totalValue = items.reduce((sum, i) => sum + (i.price_eur ?? 0) * i.quantity_owned, 0)
  const overcommitCards = items.filter((i) => i.qty_available < 0)

  type Rarity = 'mythic' | 'rare' | 'uncommon' | 'common'
  const rarityCount: Record<Rarity, number> = { mythic: 0, rare: 0, uncommon: 0, common: 0 }
  for (const item of items) {
    const r = item.rarity as Rarity
    if (r && r in rarityCount) rarityCount[r] += item.quantity_owned
  }

  const statsByDeck: Record<string, { real: number; proxy: number }> = {}
  for (const row of deckStatsRaw ?? []) {
    if (!statsByDeck[row.deck_id]) statsByDeck[row.deck_id] = { real: 0, proxy: 0 }
    if (row.usage_type === 'real') statsByDeck[row.deck_id].real += row.quantity
    if (row.usage_type === 'proxy') statsByDeck[row.deck_id].proxy += row.quantity
  }

  const decksWithStats = decks.map((deck) => ({
    ...deck,
    stats: statsByDeck[deck.id] ?? { real: 0, proxy: 0 },
  }))

  return (
    <DashboardClient
      stats={{ totalCards, uniqueCards, totalDecks: decksWithStats.length, totalValue, rarityCount }}
      overcommitCards={overcommitCards.map((c) => ({ qty_available: c.qty_available }))}
      decks={decksWithStats}
    />
  )
}

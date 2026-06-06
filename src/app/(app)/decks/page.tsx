import { createClient } from '@/lib/supabase/server'
import { DecksPageClient } from '@/components/decks/DecksPageClient'
import { Deck } from '@/types/database'

export const dynamic = 'force-dynamic'

type DeckQueryRow = Deck & {
  commander: { name_en: string; image_url: string | null } | null
}

type StatRow = { deck_id: string; usage_type: string; quantity: number }

export default async function DecksPage() {
  const supabase = await createClient()

  const { data: decksRaw } = await supabase
    .from('decks')
    .select(`*, commander:commander_card_id ( name_en, image_url )`)
    .order('created_at', { ascending: false })

  const decks = (decksRaw ?? []) as unknown as DeckQueryRow[]
  const deckIds = decks.map((d) => d.id)

  const { data: deckStatsRaw } = deckIds.length
    ? await supabase
        .from('deck_cards')
        .select('deck_id, usage_type, quantity')
        .in('deck_id', deckIds)
    : { data: null }

  const statsByDeck: Record<string, { real: number; proxy: number }> = {}
  for (const row of (deckStatsRaw ?? []) as unknown as StatRow[]) {
    if (!statsByDeck[row.deck_id]) statsByDeck[row.deck_id] = { real: 0, proxy: 0 }
    if (row.usage_type === 'real')  statsByDeck[row.deck_id].real  += row.quantity
    if (row.usage_type === 'proxy') statsByDeck[row.deck_id].proxy += row.quantity
  }

  const decksWithStats = decks.map((deck) => ({
    ...deck,
    stats: statsByDeck[deck.id] ?? { real: 0, proxy: 0 },
  }))

  return <DecksPageClient decks={decksWithStats} />
}

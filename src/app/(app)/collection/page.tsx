import { createClient } from '@/lib/supabase/server'
import { CollectionClient } from '@/components/collection/CollectionClient'

export const dynamic = 'force-dynamic'

export type DeckUsage = {
  deck_id: string
  deck_name: string
  quantity: number
  usage_type: 'real' | 'proxy'
}

export default async function CollectionPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: items, error } = await db
    .from('collection_availability')
    .select('*')
    .order('name_en') as { data: any[] | null, error: any }

  const cardIds = (items ?? []).map((i) => i.card_id)

  const { data: rawUsages } = cardIds.length > 0
    ? await db
        .from('deck_cards')
        .select('card_id, quantity, usage_type, deck:deck_id(id, name)')
        .in('card_id', cardIds) as {
          data: Array<{
            card_id: string
            quantity: number
            usage_type: 'real' | 'proxy'
            deck: { id: string; name: string }
          }> | null
        }
    : { data: [] }

  const usagesByCardId: Record<string, DeckUsage[]> = {}
  for (const u of rawUsages ?? []) {
    if (!usagesByCardId[u.card_id]) usagesByCardId[u.card_id] = []
    usagesByCardId[u.card_id].push({
      deck_id: u.deck.id,
      deck_name: u.deck.name,
      quantity: u.quantity,
      usage_type: u.usage_type,
    })
  }

  return (
    <CollectionClient
      items={items ?? []}
      usagesByCardId={usagesByCardId}
      error={error?.message}
    />
  )
}

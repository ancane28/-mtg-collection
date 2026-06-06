import { createClient } from '@/lib/supabase/server'
import { WishlistClient } from '@/components/wishlist/WishlistClient'
import { WishlistItemWithCard } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function WishlistPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: items, error } = await db
    .from('wishlist_items')
    .select(`
      id,
      quantity_wanted,
      priority,
      notes,
      created_at,
      card:card_id (
        id, name_en, name_it, mana_cost, cmc, type_line,
        colors, rarity, image_url, price_eur
      )
    `)
    .order('created_at', { ascending: false }) as {
      data: WishlistItemWithCard[] | null
      error: { message: string } | null
    }

  return (
    <WishlistClient
      items={items ?? []}
      error={error?.message}
    />
  )
}

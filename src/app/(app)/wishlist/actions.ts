'use server'

import { createClient } from '@/lib/supabase/server'
import { fetchCardByName, scryfallToDbInsert } from '@/lib/scryfall/api'
import { revalidatePath } from 'next/cache'

export async function addToWishlist(
  cardName: string,
  qty: number,
  priority: 'low' | 'medium' | 'high' = 'medium',
  notes?: string
) {
  if (qty < 1) return { error: 'Quantità non valida' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const card = await fetchCardByName(cardName)
  if (!card) return { error: 'Carta non trovata su Scryfall' }

  const { data: cardRow, error: cardError } = await db
    .from('cards')
    .upsert(scryfallToDbInsert(card), { onConflict: 'oracle_id' })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (cardError || !cardRow) return { error: cardError?.message ?? 'Errore salvataggio carta' }

  const { data: existing } = await db
    .from('wishlist_items')
    .select('id')
    .eq('card_id', cardRow.id)
    .single() as { data: { id: string } | null; error: unknown }

  if (existing) {
    return { error: 'Carta già presente nella wishlist' }
  }

  const { error } = await db
    .from('wishlist_items')
    .insert({
      card_id: cardRow.id,
      quantity_wanted: qty,
      priority,
      notes: notes?.trim() || null,
    }) as { error: { message: string } | null }

  if (error) return { error: error.message }

  revalidatePath('/wishlist')
  return { success: true }
}

export async function updateWishlistItem(
  id: string,
  qty: number,
  priority: 'low' | 'medium' | 'high',
  notes?: string
) {
  if (qty < 1) return { error: 'Quantità non valida' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { error } = await db
    .from('wishlist_items')
    .update({ quantity_wanted: qty, priority, notes: notes?.trim() || null })
    .eq('id', id) as { error: { message: string } | null }

  if (error) return { error: error.message }

  revalidatePath('/wishlist')
  return { success: true }
}

export async function removeFromWishlist(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('wishlist_items').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/wishlist')
  return { success: true }
}

export async function moveToCollection(wishlistId: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: item, error: fetchError } = await db
    .from('wishlist_items')
    .select('card_id, quantity_wanted')
    .eq('id', wishlistId)
    .single() as { data: { card_id: string; quantity_wanted: number } | null; error: { message: string } | null }

  if (fetchError || !item) return { error: fetchError?.message ?? 'Elemento non trovato' }

  const { data: existing } = await db
    .from('collection_items')
    .select('id, quantity_owned')
    .eq('card_id', item.card_id)
    .single() as { data: { id: string; quantity_owned: number } | null; error: unknown }

  if (existing) {
    const { error } = await db
      .from('collection_items')
      .update({ quantity_owned: existing.quantity_owned + item.quantity_wanted })
      .eq('id', existing.id) as { error: { message: string } | null }
    if (error) return { error: error.message }
  } else {
    const { error } = await db
      .from('collection_items')
      .insert({ card_id: item.card_id, quantity_owned: item.quantity_wanted }) as { error: { message: string } | null }
    if (error) return { error: error.message }
  }

  const { error: deleteError } = await supabase
    .from('wishlist_items')
    .delete()
    .eq('id', wishlistId)

  if (deleteError) return { error: deleteError.message }

  revalidatePath('/wishlist')
  revalidatePath('/collection')
  return { success: true }
}

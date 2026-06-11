'use server'

import { createClient } from '@/lib/supabase/server'
import { fetchCardByName, scryfallToDbInsert, fetchCardsByNames } from '@/lib/scryfall/api'
import { parseDecklist } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

interface PrintingInfo {
  scryfall_print_id: string
  set_code: string
  set_name: string
  image_url: string
}

export async function addCardToCollection(
  cardName: string,
  qty: number,
  printing?: PrintingInfo,
  isFoil = false,
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

  // Cerca riga esistente per stessa stampa + foil
  let existingQuery = db
    .from('collection_items')
    .select('id, quantity_owned')
    .eq('card_id', cardRow.id)
    .eq('is_foil', isFoil)

  if (printing) {
    existingQuery = existingQuery.eq('scryfall_print_id', printing.scryfall_print_id)
  } else {
    existingQuery = existingQuery.is('scryfall_print_id', null)
  }

  const { data: existing } = await existingQuery.single() as {
    data: { id: string; quantity_owned: number } | null; error: unknown
  }

  if (existing) {
    const { error } = await db
      .from('collection_items')
      .update({ quantity_owned: existing.quantity_owned + qty })
      .eq('id', existing.id) as { error: { message: string } | null }
    if (error) return { error: error.message }
  } else {
    const insertData: Record<string, unknown> = {
      card_id: cardRow.id,
      quantity_owned: qty,
      is_foil: isFoil,
    }
    if (printing) {
      insertData.scryfall_print_id = printing.scryfall_print_id
      insertData.set_code = printing.set_code
      insertData.set_name = printing.set_name
      insertData.print_image_url = printing.image_url
    }
    const { error } = await db
      .from('collection_items')
      .insert(insertData) as { error: { message: string } | null }
    if (error) return { error: error.message }
  }

  revalidatePath('/collection')
  return { success: true }
}

export async function updateCollectionQty(itemId: string, qty: number) {
  if (qty < 0) return { error: 'Quantità non valida' }
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  if (qty === 0) {
    const { error } = await supabase.from('collection_items').delete().eq('id', itemId)
    if (error) return { error: error.message }
  } else {
    const { error } = await db
      .from('collection_items')
      .update({ quantity_owned: qty })
      .eq('id', itemId) as { error: { message: string } | null }
    if (error) return { error: error.message }
  }

  revalidatePath('/collection')
  return { success: true }
}

export async function removeFromCollection(itemId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('collection_items').delete().eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath('/collection')
  return { success: true }
}

export async function importCollection(text: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const lines = parseDecklist(text)
  if (lines.length === 0) return { error: 'Nessuna carta trovata nel testo' }

  // Deduplica nomi
  const qtyByName = new Map<string, number>()
  for (const { qty, name } of lines) {
    qtyByName.set(name, (qtyByName.get(name) ?? 0) + qty)
  }
  const uniqueNames = [...qtyByName.keys()]

  // 1. Batch lookup nel DB locale
  type CardRow = { id: string; oracle_id: string; name_en: string }
  const { data: localCards } = await db
    .from('cards')
    .select('id, oracle_id, name_en')
    .in('name_en', uniqueNames) as { data: CardRow[] | null }

  const cardsByName = new Map<string, CardRow>(
    (localCards ?? []).map((c) => [c.name_en.toLowerCase(), c])
  )

  // 2. Fetch batch da Scryfall per le carte mancanti
  const missingNames = uniqueNames.filter((n) => !cardsByName.has(n.toLowerCase()))
  const errors: string[] = []

  if (missingNames.length > 0) {
    const { found, notFound } = await fetchCardsByNames(missingNames)
    errors.push(...notFound)

    if (found.length > 0) {
      await db.from('cards').upsert(found.map(scryfallToDbInsert), { onConflict: 'oracle_id' })
      const { data: newCards } = await db
        .from('cards')
        .select('id, oracle_id, name_en')
        .in('name_en', found.map((c) => c.name)) as { data: CardRow[] | null }
      for (const c of newCards ?? []) {
        cardsByName.set(c.name_en.toLowerCase(), c)
      }
    }
  }

  // 3. Leggi le collection_items esistenti per le carte trovate
  const cardIds = uniqueNames
    .map((n) => cardsByName.get(n.toLowerCase())?.id)
    .filter(Boolean) as string[]

  const { data: existingItems } = await db
    .from('collection_items')
    .select('id, card_id, quantity_owned')
    .in('card_id', cardIds) as {
      data: Array<{ id: string; card_id: string; quantity_owned: number }> | null
    }

  const existingByCardId = new Map(
    (existingItems ?? []).map((i) => [i.card_id, i])
  )

  // 4. Upsert collection_items (incrementa le esistenti, inserisce le nuove)
  let imported = 0
  for (const [name, qty] of qtyByName) {
    const card = cardsByName.get(name.toLowerCase())
    if (!card) continue

    const existing = existingByCardId.get(card.id)
    if (existing) {
      await db
        .from('collection_items')
        .update({ quantity_owned: existing.quantity_owned + qty })
        .eq('id', existing.id)
    } else {
      await db
        .from('collection_items')
        .insert({ card_id: card.id, quantity_owned: qty })
    }
    imported++
  }

  revalidatePath('/collection')
  return { imported, errors }
}

export async function refreshCollectionPrices() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Prendi tutte le carte nella collezione
  const { data: cards } = await db
    .from('collection_items')
    .select('card:card_id (id, name_en)') as {
      data: Array<{ card: { id: string; name_en: string } }> | null
    }

  if (!cards || cards.length === 0) return { updated: 0 }

  const names = cards.map((c) => c.card.name_en)
  const { found } = await fetchCardsByNames(names)

  // Aggiorna price_eur per ogni carta trovata
  let updated = 0
  for (const scryfallCard of found) {
    if (scryfallCard.prices?.eur == null) continue
    await db
      .from('cards')
      .update({ price_eur: parseFloat(scryfallCard.prices.eur) })
      .eq('oracle_id', scryfallCard.oracle_id)
    updated++
  }

  revalidatePath('/collection')
  return { updated }
}

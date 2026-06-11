'use server'

import { createClient } from '@/lib/supabase/server'
import { fetchCardByName, scryfallToDbInsert, fetchCardsByNames, fetchCardPrintingsByIdentifier, getCardImageUrl } from '@/lib/scryfall/api'
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autenticato' }

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
      user_id: user.id,
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

export async function removeManyFromCollection(itemIds: string[]) {
  if (itemIds.length === 0) return { success: true }
  const supabase = await createClient()
  const { error } = await supabase.from('collection_items').delete().in('id', itemIds)
  if (error) return { error: error.message }
  revalidatePath('/collection')
  return { success: true }
}

export async function importCollection(text: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autenticato' }

  const rawLines = parseDecklist(text)
  if (rawLines.length === 0) return { error: 'Nessuna carta trovata nel testo' }

  // Raggruppa per (nome + setCode + collectorNumber) per preservare stampe distinte
  const entriesByKey = new Map<string, { name: string; qty: number; setCode?: string; collectorNumber?: string }>()
  for (const line of rawLines) {
    const key = `${line.name.toLowerCase()}|${line.setCode ?? ''}|${line.collectorNumber ?? ''}`
    const existing = entriesByKey.get(key)
    if (existing) {
      existing.qty += line.qty
    } else {
      entriesByKey.set(key, { name: line.name, qty: line.qty, setCode: line.setCode, collectorNumber: line.collectorNumber })
    }
  }
  const entries = [...entriesByKey.values()]
  const uniqueNames = [...new Set(entries.map((e) => e.name))]

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

  // 3. Fetch stampe specifiche per le righe con setCode
  type PrintingData = { scryfall_print_id: string; set_code: string; set_name: string; print_image_url: string }
  const printingBySetNum = new Map<string, PrintingData>()
  const printingBySetName = new Map<string, PrintingData>()

  const withSet = entries.filter((e) => e.setCode)
  if (withSet.length > 0) {
    const fetched = await fetchCardPrintingsByIdentifier(
      withSet.map((e) => ({ name: e.name, setCode: e.setCode!, collectorNumber: e.collectorNumber }))
    )
    for (const card of fetched) {
      const p: PrintingData = {
        scryfall_print_id: card.id,
        set_code: card.set.toUpperCase(),
        set_name: card.set_name,
        print_image_url: getCardImageUrl(card),
      }
      if (card.collector_number) {
        printingBySetNum.set(`${card.set.toUpperCase()}|${card.collector_number}`, p)
      }
      printingBySetName.set(`${card.set.toUpperCase()}|${card.name.toLowerCase()}`, p)
    }
  }

  // 4. Leggi le collection_items esistenti per le carte trovate
  const cardIds = uniqueNames
    .map((n) => cardsByName.get(n.toLowerCase())?.id)
    .filter(Boolean) as string[]

  const { data: existingItems } = await db
    .from('collection_items')
    .select('id, card_id, quantity_owned, scryfall_print_id, is_foil')
    .in('card_id', cardIds) as {
      data: Array<{ id: string; card_id: string; quantity_owned: number; scryfall_print_id: string | null; is_foil: boolean }> | null
    }

  const existingByKey = new Map<string, { id: string; quantity_owned: number }>()
  for (const item of existingItems ?? []) {
    const k = `${item.card_id}|${item.scryfall_print_id ?? ''}|${item.is_foil}`
    existingByKey.set(k, { id: item.id, quantity_owned: item.quantity_owned })
  }

  // 5. Upsert collection_items
  let imported = 0
  for (const entry of entries) {
    const card = cardsByName.get(entry.name.toLowerCase())
    if (!card) continue

    // Trova la stampa specifica (prima per set+numero, poi per set+nome)
    let printing: PrintingData | undefined
    if (entry.setCode) {
      if (entry.collectorNumber) {
        printing = printingBySetNum.get(`${entry.setCode.toUpperCase()}|${entry.collectorNumber}`)
      }
      if (!printing) {
        printing = printingBySetName.get(`${entry.setCode.toUpperCase()}|${entry.name.toLowerCase()}`)
      }
    }

    const existKey = `${card.id}|${printing?.scryfall_print_id ?? ''}|false`
    const existing = existingByKey.get(existKey)

    if (existing) {
      await db
        .from('collection_items')
        .update({ quantity_owned: existing.quantity_owned + entry.qty })
        .eq('id', existing.id)
    } else {
      const insertData: Record<string, unknown> = {
        card_id: card.id,
        quantity_owned: entry.qty,
        is_foil: false,
        user_id: user.id,
      }
      if (printing) {
        insertData.scryfall_print_id = printing.scryfall_print_id
        insertData.set_code = printing.set_code
        insertData.set_name = printing.set_name
        insertData.print_image_url = printing.print_image_url
      }
      await db.from('collection_items').insert(insertData)
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

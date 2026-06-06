'use server'

import { createClient } from '@/lib/supabase/server'
import { fetchCardsByNames, scryfallToDbInsert } from '@/lib/scryfall/api'
import { parseDecklist } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

export async function createDeck(name: string, format: string | null) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('decks')
    .insert({ name: name.trim(), format })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }
  if (error || !data) return { error: error?.message ?? 'Errore creazione mazzo' }
  revalidatePath('/decks')
  return { id: data.id }
}

export async function addCardToDeck(
  deckId: string,
  cardName: string,
  qty: number,
  usageType: 'real' | 'proxy'
) {
  const supabase = await createClient()
  const db = supabase as any

  // Cerca nel DB locale
  type CardRow = { id: string; oracle_id: string; name_en: string }
  const { data: local } = await db
    .from('cards')
    .select('id, oracle_id, name_en')
    .ilike('name_en', cardName)
    .limit(1)
    .single() as { data: CardRow | null; error: unknown }

  let card: CardRow | null = local

  if (!card) {
    const { found } = await fetchCardsByNames([cardName])
    if (found.length === 0) return { error: `Carta "${cardName}" non trovata` }
    await db.from('cards').upsert(scryfallToDbInsert(found[0]), { onConflict: 'oracle_id' })
    const { data: fetched } = await db
      .from('cards')
      .select('id, oracle_id, name_en')
      .eq('oracle_id', found[0].oracle_id)
      .single() as { data: CardRow | null; error: unknown }
    if (!fetched) return { error: 'Errore salvataggio carta' }
    card = fetched
  }

  // Se la riga esiste già: incrementa qty; altrimenti inserisci
  const { data: existing } = await db
    .from('deck_cards')
    .select('id, quantity')
    .eq('deck_id', deckId)
    .eq('card_id', card.id)
    .eq('usage_type', usageType)
    .single() as { data: { id: string; quantity: number } | null; error: unknown }

  if (existing) {
    await db.from('deck_cards').update({ quantity: existing.quantity + qty }).eq('id', existing.id)
  } else {
    await db.from('deck_cards').insert({ deck_id: deckId, card_id: card.id, quantity: qty, usage_type: usageType })
  }

  revalidatePath(`/decks/${deckId}`)
  return { success: true, cardName: card.name_en }
}

export async function removeCardFromDeck(deckCardId: string) {
  const supabase = await createClient()
  const db = supabase as any
  const { data } = await db
    .from('deck_cards')
    .select('deck_id')
    .eq('id', deckCardId)
    .single() as { data: { deck_id: string } | null; error: unknown }
  const { error } = await supabase.from('deck_cards').delete().eq('id', deckCardId)
  if (error) return { error: error.message }
  if (data?.deck_id) revalidatePath(`/decks/${data.deck_id}`)
  revalidatePath('/collection')
  return { success: true }
}

export async function updateDeckCardQty(deckCardId: string, newQty: number) {
  const supabase = await createClient()
  const db = supabase as any
  const { data } = await db
    .from('deck_cards')
    .select('deck_id')
    .eq('id', deckCardId)
    .single() as { data: { deck_id: string } | null; error: unknown }

  if (newQty <= 0) {
    const { error } = await supabase.from('deck_cards').delete().eq('id', deckCardId)
    if (error) return { error: error.message }
  } else {
    const { error } = await db
      .from('deck_cards')
      .update({ quantity: newQty })
      .eq('id', deckCardId) as { error: { message: string } | null }
    if (error) return { error: error.message }
  }

  if (data?.deck_id) revalidatePath(`/decks/${data.deck_id}`)
  revalidatePath('/collection')
  return { success: true }
}

export async function toggleDeckCardType(deckCardId: string, newType: 'real' | 'proxy') {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  type DeckCardFull = { id: string; deck_id: string; card_id: string; quantity: number; usage_type: 'real' | 'proxy'; card: { oracle_id: string } }
  const { data: row } = await db
    .from('deck_cards')
    .select('id, deck_id, card_id, quantity, usage_type, card:card_id(oracle_id)')
    .eq('id', deckCardId)
    .single() as { data: DeckCardFull | null; error: unknown }

  if (!row) return { error: 'Carta non trovata' }
  if (row.usage_type === newType) return { success: true }

  // Controlla disponibilità se si vuole passare a real
  if (newType === 'real') {
    const { data: avail } = await db
      .from('collection_availability')
      .select('qty_available')
      .eq('oracle_id', row.card.oracle_id)
      .single() as { data: { qty_available: number } | null; error: unknown }

    const available = avail?.qty_available ?? 0
    if (available < row.quantity) {
      return { error: `Solo ${available} cop${available === 1 ? 'ia disponibile' : 'ie disponibili'} nella collezione` }
    }
  }

  // Controlla se esiste già una riga con il tipo target (merge)
  const { data: existing } = await db
    .from('deck_cards')
    .select('id, quantity')
    .eq('deck_id', row.deck_id)
    .eq('card_id', row.card_id)
    .eq('usage_type', newType)
    .single() as { data: { id: string; quantity: number } | null; error: unknown }

  if (existing) {
    await db.from('deck_cards').update({ quantity: existing.quantity + row.quantity }).eq('id', existing.id)
    await supabase.from('deck_cards').delete().eq('id', deckCardId)
  } else {
    await db.from('deck_cards').update({ usage_type: newType }).eq('id', deckCardId)
  }

  revalidatePath(`/decks/${row.deck_id}`)
  revalidatePath('/collection')
  return { success: true }
}

export async function setDeckCommander(deckId: string, cardId: string | null) {
  const supabase = await createClient()
  const db = supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { error } = await db
    .from('decks')
    .update({ commander_card_id: cardId })
    .eq('id', deckId) as { error: { message: string } | null }
  if (error) return { error: error.message }
  revalidatePath(`/decks/${deckId}`)
  return { success: true }
}

export async function deleteDeck(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('decks').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/decks')
  return { success: true }
}

export async function importDecklist(deckId: string, text: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const lines = parseDecklist(text)
  if (lines.length === 0) return { error: 'Nessuna carta trovata nel testo' }

  // Deduplica nomi (stessa carta due volte nella lista)
  const qtyByName = new Map<string, number>()
  for (const { qty, name } of lines) {
    qtyByName.set(name, (qtyByName.get(name) ?? 0) + qty)
  }
  const uniqueNames = [...qtyByName.keys()]

  // 1. Batch lookup nel DB locale (1 query per tutte le carte)
  type CardRow = { id: string; oracle_id: string; name_en: string }
  const { data: localCards } = await db
    .from('cards')
    .select('id, oracle_id, name_en')
    .in('name_en', uniqueNames) as { data: CardRow[] | null }

  const cardsByName = new Map<string, CardRow>(
    (localCards ?? []).map((c) => [c.name_en.toLowerCase(), c])
  )

  // 2. Fetch batch da Scryfall per le carte mancanti (max 75 per chiamata)
  const missingNames = uniqueNames.filter((n) => !cardsByName.has(n.toLowerCase()))
  const errors: string[] = []

  if (missingNames.length > 0) {
    const { found, notFound } = await fetchCardsByNames(missingNames)
    errors.push(...notFound)

    if (found.length > 0) {
      // Upsert tutte le carte nuove in una volta
      await db.from('cards').upsert(found.map(scryfallToDbInsert), { onConflict: 'oracle_id' })

      // Rileggi i loro id dal DB
      const { data: newCards } = await db
        .from('cards')
        .select('id, oracle_id, name_en')
        .in('name_en', found.map((c) => c.name)) as { data: CardRow[] | null }
      for (const c of newCards ?? []) {
        cardsByName.set(c.name_en.toLowerCase(), c)
      }
    }
  }

  // 3. Batch availability check (1 query per tutte le carte)
  const oracleIds = [...new Set(
    uniqueNames.map((n) => cardsByName.get(n.toLowerCase())?.oracle_id).filter(Boolean) as string[]
  )]

  const { data: availData } = await db
    .from('collection_availability')
    .select('oracle_id, qty_available')
    .in('oracle_id', oracleIds) as { data: Array<{ oracle_id: string; qty_available: number }> | null }

  const availByOracleId = new Map(
    (availData ?? []).map((a) => [a.oracle_id, a.qty_available])
  )

  // 4. Calcola REAL/PROXY e fai 2 upsert batch (real + proxy)
  const realRows: object[] = []
  const proxyRows: object[] = []

  for (const [name, qty] of qtyByName) {
    const card = cardsByName.get(name.toLowerCase())
    if (!card) continue

    const available = availByOracleId.get(card.oracle_id) ?? 0
    const realQty = Math.min(qty, Math.max(0, available))
    const proxyQty = qty - realQty

    if (realQty > 0) realRows.push({ deck_id: deckId, card_id: card.id, quantity: realQty, usage_type: 'real' })
    if (proxyQty > 0) proxyRows.push({ deck_id: deckId, card_id: card.id, quantity: proxyQty, usage_type: 'proxy' })
  }

  if (realRows.length > 0) {
    await db.from('deck_cards').upsert(realRows, { onConflict: 'deck_id,card_id,usage_type' })
  }
  if (proxyRows.length > 0) {
    await db.from('deck_cards').upsert(proxyRows, { onConflict: 'deck_id,card_id,usage_type' })
  }

  const realTotal = realRows.reduce((s, r: any) => s + r.quantity, 0)
  const proxyTotal = proxyRows.reduce((s, r: any) => s + r.quantity, 0)

  revalidatePath(`/decks/${deckId}`)
  revalidatePath('/collection')
  return { imported: realTotal + proxyTotal, real: realTotal, proxy: proxyTotal, errors }
}

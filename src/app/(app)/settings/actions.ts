'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { scryfallToDbInsert, ScryfallCard, SCRYFALL_HEADERS } from '@/lib/scryfall/api'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getCardStats() {
  const supabase = await createClient()
  const db = supabase as any
  const { count } = await db
    .from('cards')
    .select('*', { count: 'exact', head: true }) as { count: number | null }
  return { count: count ?? 0 }
}

export async function deleteAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autenticato' }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await adminClient.auth.admin.deleteUser(user.id)
  if (error) return { error: error.message }

  await supabase.auth.signOut()
  redirect('/login')
}

export async function syncCardsDatabase() {
  // 1. Fetch metadata
  const metaRes = await fetch('https://api.scryfall.com/bulk-data', { headers: SCRYFALL_HEADERS, cache: 'no-store' })
  if (!metaRes.ok) return { error: 'Impossibile contattare Scryfall' }

  const meta = await metaRes.json()
  const oracleEntry = (meta.data as { type: string; download_uri: string }[])
    .find((d) => d.type === 'oracle_cards')
  if (!oracleEntry) return { error: 'Bulk data oracle_cards non trovato' }

  // 2. Scarica il JSON (~26 MB)
  const dataRes = await fetch(oracleEntry.download_uri, { headers: SCRYFALL_HEADERS, cache: 'no-store' })
  if (!dataRes.ok) return { error: 'Download dati Scryfall fallito' }

  const cards: ScryfallCard[] = await dataRes.json()

  // 3. Upsert sequenziale in batch da 200 (evita payload troppo grandi)
  const supabase = await createClient()
  const db = supabase as any
  const BATCH = 200

  for (let i = 0; i < cards.length; i += BATCH) {
    const batch = cards.slice(i, i + BATCH).map(scryfallToDbInsert)
    await db.from('cards').upsert(batch, { onConflict: 'oracle_id' })
  }

  revalidatePath('/settings')
  return { imported: cards.length }
}

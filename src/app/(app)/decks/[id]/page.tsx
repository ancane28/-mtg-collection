import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { DeckCardList } from '@/components/decks/DeckCardList'
import { DeckActionButtons } from '@/components/decks/DeckActionButtons'
import { SetCommanderButton } from '@/components/decks/SetCommanderButton'
import { Card } from '@/types/database'

export const dynamic = 'force-dynamic'

interface DeckCardRow {
  id: string
  quantity: number
  usage_type: 'real' | 'proxy'
  card: Card
}

export default async function DeckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: deck, error } = await db
    .from('decks')
    .select('*, commander:commander_card_id(id, name_en, image_url)')
    .eq('id', id)
    .single() as {
      data: {
        id: string
        name: string
        format: string | null
        commander_card_id: string | null
        notes: string | null
        commander: { id: string; name_en: string; image_url: string | null } | null
      } | null
      error: unknown
    }

  if (error || !deck) notFound()

  const { data: deckCardsRaw } = await db
    .from('deck_cards')
    .select(`
      id, quantity, usage_type,
      card:card_id ( id, oracle_id, name_en, mana_cost, cmc, type_line, colors, rarity, image_url, price_eur, power, toughness, oracle_text, name_it, updated_at )
    `)
    .eq('deck_id', id)
    .order('quantity', { ascending: false }) as { data: DeckCardRow[] | null }

  const deckCards: DeckCardRow[] = deckCardsRaw ?? []

  // Mappa oracle_id → qty_available per i controlli real/proxy
  const oracleIds = [...new Set(deckCards.map((r) => r.card?.oracle_id).filter(Boolean))]
  const availabilityMap: Record<string, number> = {}

  if (oracleIds.length > 0) {
    const { data: avail } = await db
      .from('collection_availability')
      .select('oracle_id, qty_available')
      .in('oracle_id', oracleIds) as { data: Array<{ oracle_id: string; qty_available: number }> | null }

    for (const row of avail ?? []) {
      availabilityMap[row.oracle_id] = row.qty_available
    }
  }

  const totalCards = deckCards.reduce((s, r) => s + r.quantity, 0)
  const realCards = deckCards.filter((r) => r.usage_type === 'real').reduce((s, r) => s + r.quantity, 0)
  const proxyCards = totalCards - realCards

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">{deck.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {deck.format && (
                <span className="text-xs text-gray-400 capitalize">{deck.format}</span>
              )}
              <span className="text-xs text-gray-600">·</span>
              <span className="text-xs text-gray-400">{totalCards} carte</span>
              <span className="text-xs text-green-500">{realCards} real</span>
              {proxyCards > 0 && <span className="text-xs text-yellow-500">{proxyCards} proxy</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DeckActionButtons deckId={deck.id} />
          </div>
        </div>

        {/* Comandante */}
        {deck.format === 'commander' && (
          <div className="mt-4 flex items-center gap-3">
            {deck.commander ? (
              <>
                {deck.commander.image_url && (
                  <img
                    src={deck.commander.image_url}
                    alt={deck.commander.name_en}
                    className="w-10 h-10 rounded-full object-cover border border-gray-700"
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-white">{deck.commander.name_en}</p>
                  <SetCommanderButton
                    deckId={deck.id}
                    currentCommanderId={deck.commander_card_id}
                    deckCards={deckCards}
                  />
                </div>
              </>
            ) : (
              <div>
                <p className="text-sm text-gray-500">Nessun comandante impostato</p>
                <SetCommanderButton
                  deckId={deck.id}
                  currentCommanderId={null}
                  deckCards={deckCards}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista carte */}
      {deckCards.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-sm">
          Nessuna carta nel mazzo. Usa &quot;+ Carta&quot; o &quot;Importa&quot; per aggiungerne.
        </div>
      ) : (
        <DeckCardList deckCards={deckCards} availabilityMap={availabilityMap} />
      )}
    </div>
  )
}

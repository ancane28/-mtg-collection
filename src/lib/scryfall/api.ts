const SCRYFALL_BASE = 'https://api.scryfall.com'
export const SCRYFALL_HEADERS = { 'User-Agent': 'MTGCollectionManager/1.0 (personal app)', 'Accept': 'application/json' }

export interface ScryfallCard {
  id: string
  oracle_id: string
  name: string
  set: string
  set_name: string
  collector_number?: string
  nonfoil: boolean
  foil: boolean
  printed_name?: string
  mana_cost?: string
  cmc: number
  oracle_text?: string
  type_line: string
  power?: string
  toughness?: string
  colors: string[]
  color_identity: string[]
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic' | 'special' | 'bonus'
  prices?: { eur?: string | null; eur_foil?: string | null; usd?: string | null }
  image_uris?: {
    small: string
    normal: string
    large: string
    art_crop: string
    border_crop: string
  }
  card_faces?: Array<{
    name: string
    mana_cost?: string
    oracle_text?: string
    type_line?: string
    power?: string
    toughness?: string
    image_uris?: {
      small: string
      normal: string
      large: string
      art_crop: string
      border_crop: string
    }
  }>
}

export interface ScryfallSearchResult {
  data: ScryfallCard[]
  has_more: boolean
  total_cards: number
  next_page?: string
}

/** Cerca una carta per nome esatto (fuzzy fallback automatico di Scryfall) */
export async function fetchCardByName(name: string): Promise<ScryfallCard | null> {
  try {
    const url = `${SCRYFALL_BASE}/cards/named?fuzzy=${encodeURIComponent(name)}`
    const res = await fetch(url, { headers: SCRYFALL_HEADERS, next: { revalidate: 86400 } })
    if (!res.ok) return null
    return res.json() as Promise<ScryfallCard>
  } catch {
    return null
  }
}

/** Cerca carte per query Scryfall (es: "name:counterspell") */
export async function searchCards(query: string): Promise<ScryfallCard[]> {
  try {
    const url = `${SCRYFALL_BASE}/cards/search?q=${encodeURIComponent(query)}&unique=cards&order=name`
    const res = await fetch(url, { headers: SCRYFALL_HEADERS, next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data: ScryfallSearchResult = await res.json()
    return data.data || []
  } catch {
    return []
  }
}

/** Fetch batch di carte per nome — usa /cards/collection (max 75 per chiamata),
 *  con fallback fuzzy individuale per le carte non trovate dal batch (es. DFC con //) */
export async function fetchCardsByNames(names: string[]): Promise<{
  found: ScryfallCard[]
  notFound: string[]
}> {
  if (names.length === 0) return { found: [], notFound: [] }

  const allFound: ScryfallCard[] = []
  const batchNotFound: string[] = []

  for (let i = 0; i < names.length; i += 75) {
    const batch = names.slice(i, i + 75)
    try {
      const res = await fetch(`${SCRYFALL_BASE}/cards/collection`, {
        method: 'POST',
        headers: { ...SCRYFALL_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiers: batch.map((name) => ({ name })) }),
        cache: 'no-store',
      })
      if (!res.ok) { batchNotFound.push(...batch); continue }
      const data = await res.json()
      allFound.push(...(data.data ?? []))
      batchNotFound.push(...(data.not_found ?? []).map((id: { name?: string }) => id.name ?? '?'))
    } catch {
      batchNotFound.push(...batch)
    }
    if (i + 75 < names.length) await new Promise((r) => setTimeout(r, 100))
  }

  // Fallback fuzzy per le carte non trovate dal batch (gestisce DFC e varianti di nome)
  const allNotFound: string[] = []
  for (const name of batchNotFound) {
    try {
      const res = await fetch(
        `${SCRYFALL_BASE}/cards/named?fuzzy=${encodeURIComponent(name)}`,
        { headers: SCRYFALL_HEADERS, cache: 'no-store' }
      )
      if (res.ok) {
        allFound.push(await res.json() as ScryfallCard)
      } else {
        allNotFound.push(name)
      }
    } catch {
      allNotFound.push(name)
    }
  }

  return { found: allFound, notFound: allNotFound }
}

/** Fetch batch di stampe specifiche tramite set+collector_number (o set+nome) */
export async function fetchCardPrintingsByIdentifier(
  identifiers: Array<{ name?: string; setCode: string; collectorNumber?: string }>
): Promise<ScryfallCard[]> {
  if (identifiers.length === 0) return []
  const allFound: ScryfallCard[] = []
  for (let i = 0; i < identifiers.length; i += 75) {
    const batch = identifiers.slice(i, i + 75)
    try {
      const res = await fetch(`${SCRYFALL_BASE}/cards/collection`, {
        method: 'POST',
        headers: { ...SCRYFALL_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifiers: batch.map((id) =>
            id.collectorNumber
              ? { set: id.setCode.toLowerCase(), collector_number: id.collectorNumber }
              : { name: id.name, set: id.setCode.toLowerCase() }
          ),
        }),
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        allFound.push(...(data.data ?? []))
      }
    } catch { /* ignore */ }
    if (i + 75 < identifiers.length) await new Promise((r) => setTimeout(r, 100))
  }
  return allFound
}

/** Recupera tutte le stampe disponibili di una carta (per nome esatto) */
export async function fetchCardPrintings(cardName: string): Promise<ScryfallCard[]> {
  try {
    const url = `${SCRYFALL_BASE}/cards/search?q=!"${encodeURIComponent(cardName)}"&unique=prints&order=released`
    const res = await fetch(url, { headers: SCRYFALL_HEADERS })
    if (!res.ok) return []
    const data: ScryfallSearchResult = await res.json()
    return data.data || []
  } catch {
    return []
  }
}

/** Autocomplete per nome carta */
export async function autocompleteCardName(partial: string): Promise<string[]> {
  if (partial.length < 2) return []
  try {
    const url = `${SCRYFALL_BASE}/cards/autocomplete?q=${encodeURIComponent(partial)}`
    const res = await fetch(url, { headers: SCRYFALL_HEADERS, next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data: { data: string[] } = await res.json()
    return data.data || []
  } catch {
    return []
  }
}

/** Estrae l'URL immagine dalla carta (gestisce double-faced) */
export function getCardImageUrl(card: ScryfallCard): string {
  if (card.image_uris?.normal) return card.image_uris.normal
  if (card.card_faces?.[0]?.image_uris?.normal) return card.card_faces[0].image_uris.normal
  return ''
}

/** Converte una ScryfallCard nel formato Insert per la tabella cards */
export function scryfallToDbInsert(card: ScryfallCard) {
  const rarity = ['common', 'uncommon', 'rare', 'mythic'].includes(card.rarity)
    ? (card.rarity as 'common' | 'uncommon' | 'rare' | 'mythic')
    : null

  return {
    oracle_id: card.oracle_id,
    name_en: card.name,
    name_it: card.printed_name ?? null,
    mana_cost: card.mana_cost ?? null,
    cmc: card.cmc,
    oracle_text: card.oracle_text ?? card.card_faces?.[0]?.oracle_text ?? null,
    type_line: card.type_line ?? card.card_faces?.[0]?.type_line ?? null,
    power: card.power ?? card.card_faces?.[0]?.power ?? null,
    toughness: card.toughness ?? card.card_faces?.[0]?.toughness ?? null,
    colors: (card.colors?.length ?? 0) > 0 ? card.colors : (card.color_identity ?? []),
    rarity,
    image_url: getCardImageUrl(card),
    price_eur: card.prices?.eur ? parseFloat(card.prices.eur) : null,
  }
}

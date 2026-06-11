/** Concatena classi CSS filtrando valori falsy (alternativa a clsx) */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

/** Formatta il costo di mana rimuovendo le graffe (es: {2}{U}{U} → 2UU) */
export function formatManaCost(cost: string | null | undefined): string {
  if (!cost) return ''
  return cost.replace(/[{}]/g, '')
}

/** Restituisce il colore CSS per una rarità */
export function rarityColor(rarity: string | null): string {
  switch (rarity) {
    case 'mythic':   return 'text-orange-400'
    case 'rare':     return 'text-yellow-400'
    case 'uncommon': return 'text-gray-300'
    case 'common':   return 'text-gray-500'
    default:         return 'text-gray-400'
  }
}

/** Determina la variante badge in base alla disponibilità */
export function availabilityVariant(available: number): 'available' | 'overcommit' | 'neutral' {
  if (available < 0) return 'overcommit'
  if (available > 0) return 'available'
  return 'neutral'
}

/** Parse una riga di decklist nel formato "N NomeCarta" (supporta anche MTGA/MTGO con set code) */
export function parseDecklistLine(line: string): { qty: number; name: string } | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('SB:')) return null
  // Rimuove sezioni tipo "Deck", "Sideboard", "Commander"
  if (/^(deck|sideboard|commander|companion)$/i.test(trimmed)) return null
  const match = trimmed.match(/^(\d+)\s+(.+)$/)
  if (!match) return null
  let name = match[2].trim()
  // Rimuove virgolette esterne: "Commander’s Sphere (CMM) 377" → Commander’s Sphere (CMM) 377
  if (name.charCodeAt(0) === 34 && name.charCodeAt(name.length - 1) === 34) name = name.slice(1, -1).trim()
  // Normalizza apostrofi curvi → dritti: "Kazuul’s" → "Kazuul’s"
  name = name.replace(/[‘’‚‛]/g, "’")
  // Normalizza separatore bifronte: "Name//Back" o "Name //Back" → "Name // Back"
  name = name.replace(/\s*\/\/\s*/g, ' // ').trim()
  // Rimuove set code, collector number E label come "(Commander)": "Wick, the Whorled Mind (Commander)" → "Wick, the Whorled Mind"
  name = name.replace(/\s*\([^)]+\)\s*\d*\s*$/, '').trim()
  // Rimuove eventuali tag aggiuntivi tipo "*F*" (foil in alcuni tool)
  name = name.replace(/\s*\*[A-Z]+\*\s*$/, '').trim()
  if (!name) return null
  return { qty: parseInt(match[1], 10), name }
}

/** Parse l'intero testo di una decklist */
export function parseDecklist(text: string): Array<{ qty: number; name: string }> {
  return text
    .split('\n')
    .map(parseDecklistLine)
    .filter((r): r is { qty: number; name: string } => r !== null)
}

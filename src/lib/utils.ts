/** Concatena classi CSS filtrando valori falsy (alternativa a clsx) */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

/** Formatta il costo di mana rimuovendo le graffe */
export function formatManaCost(cost: string | null | undefined): string {
  if (!cost) return ''
  return cost.replace(/[{}]/g, '')
}

/** Restituisce il colore CSS per una rarita */
export function rarityColor(rarity: string | null): string {
  switch (rarity) {
    case 'mythic':   return 'text-orange-400'
    case 'rare':     return 'text-yellow-400'
    case 'uncommon': return 'text-gray-300'
    case 'common':   return 'text-gray-500'
    default:         return 'text-gray-400'
  }
}

/** Determina la variante badge in base alla disponibilita */
export function availabilityVariant(available: number): 'available' | 'overcommit' | 'neutral' {
  if (available < 0) return 'overcommit'
  if (available > 0) return 'available'
  return 'neutral'
}

/** Parse una riga di decklist (supporta MTGA/MTGO con set code tipo "(DMU) 42") */
export function parseDecklistLine(line: string): { qty: number; name: string; setCode?: string; collectorNumber?: string } | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('SB:')) return null
  if (/^(deck|sideboard|commander|companion)$/i.test(trimmed)) return null
  const match = trimmed.match(/^(\d+)\s+(.+)$/)
  if (!match) return null
  let name = match[2].trim()
  // Rimuove virgolette esterne
  if (name.charCodeAt(0) === 34 && name.charCodeAt(name.length - 1) === 34) name = name.slice(1, -1).trim()
  // Normalizza apostrofi curvi (U+2018/U+2019/U+201A/U+201B) a dritti
  name = name.replace(/[''‚‛]/g, String.fromCharCode(39))
  // Normalizza separatore bifronte
  name = name.replace(/\s*\/\/\s*/g, ' // ').trim()
  // Estrae set code e collector number (es: "(DMU) 42") prima di rimuoverli
  let setCode: string | undefined
  let collectorNumber: string | undefined
  const setMatch = name.match(/\s*\(([A-Z0-9]{2,6})\)\s*(\d+[a-zA-Z]?)?\s*$/)
  if (setMatch) {
    setCode = setMatch[1]
    if (setMatch[2]) collectorNumber = setMatch[2]
  }
  // Rimuove set code, collector number e label tipo "(Commander)"
  name = name.replace(/\s*\([^)]+\)\s*\d*\s*$/, '').trim()
  // Rimuove tag tipo "*F*"
  name = name.replace(/\s*\*[A-Z]+\*\s*$/, '').trim()
  if (!name) return null
  return { qty: parseInt(match[1], 10), name, setCode, collectorNumber }
}

/** Parse il testo completo di una decklist */
export function parseDecklist(text: string): Array<{ qty: number; name: string; setCode?: string; collectorNumber?: string }> {
  return text
    .split('\n')
    .map(parseDecklistLine)
    .filter((r): r is { qty: number; name: string; setCode?: string; collectorNumber?: string } => r !== null)
}
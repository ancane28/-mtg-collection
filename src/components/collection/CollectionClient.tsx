'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AddCardModal } from './AddCardModal'
import { ImportCollectionModal } from './ImportCollectionModal'
import { CollectionAvailability } from '@/types/database'
import { availabilityVariant, formatManaCost, rarityColor } from '@/lib/utils'
import { updateCollectionQty, removeFromCollection, refreshCollectionPrices } from '@/app/(app)/collection/actions'
import { DeckUsage } from '@/app/(app)/collection/page'

interface CollectionClientProps {
  items: CollectionAvailability[]
  usagesByCardId: Record<string, DeckUsage[]>
  error?: string
}

interface EditingRow {
  id: string
  qty: number
}

type ViewMode = 'list' | 'grid'
type SortKey = 'name_asc' | 'name_desc' | 'cmc_asc' | 'cmc_desc' | 'price_asc' | 'price_desc' | 'qty_asc' | 'qty_desc'

const RARITIES = ['common', 'uncommon', 'rare', 'mythic'] as const
const COLORS = ['W', 'U', 'B', 'R', 'G', 'C', 'M'] as const
const COLOR_LABELS: Record<string, string> = { W: '☀', U: '💧', B: '💀', R: '🔥', G: '🌲', C: '◇', M: '★' }
const COLOR_STYLE: Record<string, string> = {
  W: 'bg-yellow-100 text-yellow-900 border-yellow-300',
  U: 'bg-blue-600 text-white border-blue-400',
  B: 'bg-gray-800 text-gray-100 border-gray-600',
  R: 'bg-red-600 text-white border-red-400',
  G: 'bg-green-700 text-white border-green-500',
  C: 'bg-gray-600 text-gray-100 border-gray-400',
  M: 'bg-gradient-to-r from-yellow-500 to-red-500 text-white border-yellow-400',
}

const TYPE_GROUPS = ['Creature', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Planeswalker', 'Land', 'Other']

function getTypeGroup(typeLine: string | null): string {
  if (!typeLine) return 'Other'
  const t = typeLine.toLowerCase()
  if (t.includes('land'))         return 'Land'
  if (t.includes('creature'))     return 'Creature'
  if (t.includes('planeswalker')) return 'Planeswalker'
  if (t.includes('instant'))      return 'Instant'
  if (t.includes('sorcery'))      return 'Sorcery'
  if (t.includes('artifact'))     return 'Artifact'
  if (t.includes('enchantment'))  return 'Enchantment'
  return 'Other'
}

function getColorKey(colors: string[]): string {
  if (!colors || colors.length === 0) return 'C'
  if (colors.length > 1) return 'M'
  return colors[0]
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name_asc',   label: 'Nome A→Z' },
  { value: 'name_desc',  label: 'Nome Z→A' },
  { value: 'cmc_asc',    label: 'Mana ↑' },
  { value: 'cmc_desc',   label: 'Mana ↓' },
  { value: 'price_asc',  label: 'Prezzo ↑' },
  { value: 'price_desc', label: 'Prezzo ↓' },
  { value: 'qty_asc',    label: 'Quantità ↑' },
  { value: 'qty_desc',   label: 'Quantità ↓' },
]

export function CollectionClient({ items, usagesByCardId, error }: CollectionClientProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<EditingRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<ViewMode>('list')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshResult, setRefreshResult] = useState<string | null>(null)

  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filtri
  const [search, setSearch]                 = useState('')
  const [activeColors, setActiveColors]     = useState<Set<string>>(new Set())
  const [activeRarities, setActiveRarities] = useState<Set<string>>(new Set())
  const [activeTypes, setActiveTypes]       = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<SortKey>('name_asc')

  function toggle<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set)
    next.has(value) ? next.delete(value) : next.add(value)
    return next
  }

  const filtered = useMemo(() => {
    let result = [...items]

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((i) =>
        i.name_en.toLowerCase().includes(q) ||
        (i.name_it ?? '').toLowerCase().includes(q)
      )
    }

    if (activeColors.size > 0) {
      result = result.filter((i) => activeColors.has(getColorKey(i.colors)))
    }
    if (activeRarities.size > 0) {
      result = result.filter((i) => i.rarity && activeRarities.has(i.rarity))
    }
    if (activeTypes.size > 0) {
      result = result.filter((i) => activeTypes.has(getTypeGroup(i.type_line)))
    }

    result.sort((a, b) => {
      switch (sort) {
        case 'name_asc':   return (a.name_en).localeCompare(b.name_en)
        case 'name_desc':  return (b.name_en).localeCompare(a.name_en)
        case 'cmc_asc':    return (a.cmc ?? 0) - (b.cmc ?? 0)
        case 'cmc_desc':   return (b.cmc ?? 0) - (a.cmc ?? 0)
        case 'price_asc':  return (a.price_eur ?? -1) - (b.price_eur ?? -1)
        case 'price_desc': return (b.price_eur ?? -1) - (a.price_eur ?? -1)
        case 'qty_asc':    return a.quantity_owned - b.quantity_owned
        case 'qty_desc':   return b.quantity_owned - a.quantity_owned
      }
    })

    return result
  }, [items, search, activeColors, activeRarities, activeTypes, sort])

  const hasFilters = search !== '' || activeColors.size > 0 || activeRarities.size > 0 || activeTypes.size > 0

  async function handleSaveQty() {
    if (!editing) return
    setSaving(true)
    await updateCollectionQty(editing.id, editing.qty)
    setSaving(false)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Rimuovere questa carta dalla collezione?')) return
    await removeFromCollection(id)
  }

  async function handleRefreshPrices() {
    setRefreshing(true)
    setRefreshResult(null)
    const res = await refreshCollectionPrices()
    setRefreshResult(`${res.updated} prezzi aggiornati`)
    setRefreshing(false)
    router.refresh()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Collezione</h1>
          <p className="text-sm text-gray-400 mt-1">
            {filtered.length !== items.length
              ? `${filtered.length} / ${items.length} carte`
              : `${items.length} carte`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-700 overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 transition-colors ${view === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Vista lista"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-1.5 transition-colors ${view === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Vista griglia"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
          </div>
          <Button variant="secondary" loading={refreshing} onClick={handleRefreshPrices}>
            <span className="hidden sm:inline">Aggiorna prezzi</span>
            <span className="sm:hidden">Prezzi</span>
          </Button>
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <span className="hidden sm:inline">Importa lista</span>
            <span className="sm:hidden">Importa</span>
          </Button>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            + Aggiungi
          </Button>
        </div>
      </div>

      {/* Barra di ricerca */}
      <div className="mb-3 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          placeholder="Cerca per nome…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Barra filtri + ordinamento */}
      <div className="mb-4 p-3 bg-gray-900 border border-gray-800 rounded-xl space-y-2.5">
        {/* Riga 1: Colori + Rarità */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 uppercase tracking-wider mr-1">Colore</span>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setActiveColors(toggle(activeColors, c))}
                className={`w-7 h-7 rounded-full border-2 text-xs font-bold transition-all ${COLOR_STYLE[c]} ${
                  activeColors.has(c) ? 'scale-110 ring-2 ring-white/40' : 'opacity-50 hover:opacity-80'
                }`}
                title={c}
              >
                {COLOR_LABELS[c]}
              </button>
            ))}
          </div>
          <div className="hidden sm:block w-px h-6 bg-gray-700" />
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-500 uppercase tracking-wider mr-1">Rarità</span>
            {RARITIES.map((r) => (
              <button
                key={r}
                onClick={() => setActiveRarities(toggle(activeRarities, r))}
                className={`px-2 py-0.5 rounded text-xs capitalize transition-all border ${
                  activeRarities.has(r)
                    ? `${rarityColor(r)} border-current bg-white/10`
                    : 'text-gray-500 border-gray-700 hover:border-gray-500'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Riga 2: Tipo + Ordinamento */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            <span className="text-xs text-gray-500 uppercase tracking-wider mr-1">Tipo</span>
            {TYPE_GROUPS.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTypes(toggle(activeTypes, t))}
                className={`px-2 py-0.5 rounded text-xs transition-all border ${
                  activeTypes.has(t)
                    ? 'text-purple-300 border-purple-500 bg-purple-900/30'
                    : 'text-gray-500 border-gray-700 hover:border-gray-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setActiveColors(new Set()); setActiveRarities(new Set()); setActiveTypes(new Set()) }}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Azzera
              </button>
            )}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="bg-gray-800 border border-gray-700 rounded-lg text-sm text-white px-2 py-1 focus:outline-none focus:border-purple-500"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
          Errore caricamento: {error}
        </div>
      )}
      {refreshResult && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-800 rounded-lg text-green-300 text-sm">
          {refreshResult}
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">Nessuna carta nella collezione</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm">Aggiungi le tue prime carte cercandole per nome</p>
          <Button variant="primary" onClick={() => setModalOpen(true)}>+ Aggiungi carte</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p>Nessuna carta corrisponde ai filtri selezionati.</p>
          <button
            onClick={() => { setSearch(''); setActiveColors(new Set()); setActiveRarities(new Set()); setActiveTypes(new Set()) }}
            className="mt-2 text-sm text-purple-400 hover:text-purple-300"
          >
            Azzera filtri
          </button>
        </div>
      ) : view === 'list' ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Carta</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-center">Mana</th>
                <th className="px-4 py-3 text-center">Rarità</th>
                <th className="px-4 py-3 text-center">Prezzo</th>
                <th className="px-4 py-3 text-center">Possedute</th>
                <th className="px-4 py-3 text-center">Usate</th>
                <th className="px-4 py-3 text-center">Disponibili</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filtered.map(item => {
                const variant = availabilityVariant(item.qty_available)
                const isEditing = editing?.id === item.id
                const isExpanded = expandedId === item.id
                const usages = usagesByCardId[item.card_id] ?? []
                const hasUsages = usages.length > 0

                return (
                  <React.Fragment key={item.id}>
                    <tr
                      className={`group hover:bg-gray-800/40 transition-colors ${hasUsages ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-gray-800/30' : ''}`}
                      onClick={() => hasUsages && setExpandedId(isExpanded ? null : item.id)}
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          {hasUsages && (
                            <svg
                              className={`w-3 h-3 text-gray-500 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                          <div>
                            <div className="font-medium text-white">{item.name_en}</div>
                            {item.name_it && <div className="text-xs text-gray-500">{item.name_it}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-gray-400 max-w-40 truncate">{item.type_line}</td>
                      <td className="px-4 py-2 text-center font-mono text-gray-300">
                        {formatManaCost(item.mana_cost)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`text-xs capitalize ${rarityColor(item.rarity)}`}>
                          {item.rarity}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center text-gray-300 text-xs">
                        {item.price_eur != null ? `€${item.price_eur.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-2 text-center" onClick={e => e.stopPropagation()}>
                        {isEditing ? (
                          <input
                            type="number" min={0} max={99}
                            value={editing.qty}
                            onChange={e => setEditing({ id: item.id, qty: parseInt(e.target.value) || 0 })}
                            className="w-16 bg-gray-800 border border-purple-500 rounded px-2 py-0.5 text-white text-sm text-center focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <span className="text-white font-medium">{item.quantity_owned}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`text-sm ${hasUsages ? 'text-blue-400 font-medium' : 'text-gray-400'}`}>
                          {item.qty_used}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Badge variant={variant}>
                          {item.qty_available > 0 ? '+' : ''}{item.qty_available}
                        </Badge>
                      </td>
                      <td className="px-4 py-2" onClick={e => e.stopPropagation()}>
                        {isEditing ? (
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" variant="primary" loading={saving} onClick={handleSaveQty}>✓</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>✕</Button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="ghost" onClick={() => setEditing({ id: item.id, qty: item.quantity_owned })}>Mod</Button>
                            <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)}>✕</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${item.id}-decks`} className="bg-gray-800/20">
                        <td colSpan={9} className="px-8 py-2">
                          <div className="flex flex-wrap gap-2">
                            {usages.map((u, i) => (
                              <div key={i} className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5">
                                <span className="text-sm text-white">{u.deck_name}</span>
                                <span className="text-xs text-gray-500">{u.quantity}x</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  u.usage_type === 'real'
                                    ? 'bg-green-900/40 text-green-400'
                                    : 'bg-yellow-900/30 text-yellow-500'
                                }`}>
                                  {u.usage_type.toUpperCase()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {TYPE_GROUPS.filter((type) => filtered.some((i) => getTypeGroup(i.type_line) === type)).map((type) => {
            const group = filtered.filter((i) => getTypeGroup(i.type_line) === type)
            return (
              <div key={type}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {type} ({group.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {group.map(item => (
                    <div key={item.id} className="flex flex-col rounded-xl overflow-hidden bg-gray-900 border border-gray-800 hover:border-gray-600 transition-colors">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt={item.name_en} className="w-full h-auto" />
                      ) : (
                        <div className="w-full aspect-[5/7] bg-gray-800 flex items-center justify-center text-gray-600 text-xs text-center px-2">
                          {item.name_en}
                        </div>
                      )}
                      <div className="p-2 flex flex-col gap-0.5">
                        <span className={`text-xs font-medium truncate ${rarityColor(item.rarity)}`}>
                          {item.name_en}
                        </span>
                        <span className="text-xs text-gray-400">
                          {item.price_eur != null ? `€${item.price_eur.toFixed(2)}` : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AddCardModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <ImportCollectionModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}

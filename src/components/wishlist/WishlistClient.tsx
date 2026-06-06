'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { AddToWishlistModal } from './AddToWishlistModal'
import { WishlistItemWithCard } from '@/types/database'
import { formatManaCost, rarityColor } from '@/lib/utils'
import { removeFromWishlist, updateWishlistItem, moveToCollection } from '@/app/(app)/wishlist/actions'

interface WishlistClientProps {
  items: WishlistItemWithCard[]
  error?: string
}

type Priority = 'low' | 'medium' | 'high'
type SortKey = 'added_desc' | 'added_asc' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'priority'

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; order: number }> = {
  high:   { label: 'Alta',   color: 'bg-red-900/40 text-red-400 border-red-800/50',       order: 0 },
  medium: { label: 'Media',  color: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/40', order: 1 },
  low:    { label: 'Bassa',  color: 'bg-gray-800 text-gray-400 border-gray-700',           order: 2 },
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'added_desc', label: 'Aggiunte recenti' },
  { value: 'added_asc',  label: 'Aggiunte meno recenti' },
  { value: 'priority',   label: 'Priorità' },
  { value: 'name_asc',   label: 'Nome A→Z' },
  { value: 'name_desc',  label: 'Nome Z→A' },
  { value: 'price_asc',  label: 'Prezzo ↑' },
  { value: 'price_desc', label: 'Prezzo ↓' },
]

interface EditingRow {
  id: string
  qty: number
  priority: Priority
  notes: string
}

export function WishlistClient({ items, error }: WishlistClientProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<EditingRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('added_desc')
  const [filterPriority, setFilterPriority] = useState<Priority | null>(null)

  const filtered = useMemo(() => {
    let result = [...items]

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(i =>
        i.card.name_en.toLowerCase().includes(q) ||
        (i.card.name_it ?? '').toLowerCase().includes(q)
      )
    }

    if (filterPriority) {
      result = result.filter(i => i.priority === filterPriority)
    }

    result.sort((a, b) => {
      switch (sort) {
        case 'added_desc':  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'added_asc':   return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name_asc':    return a.card.name_en.localeCompare(b.card.name_en)
        case 'name_desc':   return b.card.name_en.localeCompare(a.card.name_en)
        case 'price_asc':   return (a.card.price_eur ?? -1) - (b.card.price_eur ?? -1)
        case 'price_desc':  return (b.card.price_eur ?? -1) - (a.card.price_eur ?? -1)
        case 'priority':    return PRIORITY_CONFIG[a.priority].order - PRIORITY_CONFIG[b.priority].order
      }
    })

    return result
  }, [items, search, sort, filterPriority])

  const totalEur = useMemo(() => {
    return items.reduce((sum, i) => sum + (i.card.price_eur ?? 0) * i.quantity_wanted, 0)
  }, [items])

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    await updateWishlistItem(editing.id, editing.qty, editing.priority, editing.notes)
    setSaving(false)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Rimuovere dalla wishlist?')) return
    await removeFromWishlist(id)
  }

  async function handleMoveToCollection(id: string) {
    if (!confirm('Aggiungere alla collezione e rimuovere dalla wishlist?')) return
    setMovingId(id)
    await moveToCollection(id)
    setMovingId(null)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Wishlist</h1>
          <p className="text-sm text-gray-400 mt-1">
            {filtered.length !== items.length
              ? `${filtered.length} / ${items.length} carte`
              : `${items.length} carte`}
            {items.length > 0 && totalEur > 0 && (
              <span className="ml-3 text-purple-400">≈ €{totalEur.toFixed(2)} totale</span>
            )}
          </p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          + Aggiungi carta
        </Button>
      </div>

      {/* Barra ricerca + filtri */}
      <div className="mb-3 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          placeholder="Cerca per nome…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="mb-4 p-3 bg-gray-900 border border-gray-800 rounded-xl flex flex-wrap items-center gap-3">
        {/* Filtro priorità */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 uppercase tracking-wider mr-1">Priorità</span>
          {(['high', 'medium', 'low'] as Priority[]).map(p => (
            <button
              key={p}
              onClick={() => setFilterPriority(filterPriority === p ? null : p)}
              className={`px-2 py-0.5 rounded text-xs border transition-all ${
                filterPriority === p
                  ? PRIORITY_CONFIG[p].color
                  : 'text-gray-500 border-gray-700 hover:border-gray-500'
              }`}
            >
              {PRIORITY_CONFIG[p].label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-gray-700" />

        {/* Ordinamento */}
        <div className="flex items-center gap-2 ml-auto">
          {(search || filterPriority) && (
            <button
              onClick={() => { setSearch(''); setFilterPriority(null) }}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Azzera filtri
            </button>
          )}
          <span className="text-xs text-gray-500 uppercase tracking-wider">Ordina</span>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="bg-gray-800 border border-gray-700 rounded-lg text-sm text-white px-2 py-1 focus:outline-none focus:border-purple-500"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
          Errore caricamento: {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">Wishlist vuota</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm">Aggiungi le carte che vuoi acquistare</p>
          <Button variant="primary" onClick={() => setModalOpen(true)}>+ Aggiungi carta</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p>Nessuna carta corrisponde ai filtri.</p>
          <button
            onClick={() => { setSearch(''); setFilterPriority(null) }}
            className="mt-2 text-sm text-purple-400 hover:text-purple-300"
          >
            Azzera filtri
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Carta</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-center">Mana</th>
                <th className="px-4 py-3 text-center">Rarità</th>
                <th className="px-4 py-3 text-center">Prezzo</th>
                <th className="px-4 py-3 text-center">Copie</th>
                <th className="px-4 py-3 text-center">Priorità</th>
                <th className="px-4 py-3 text-left">Note</th>
                <th className="px-4 py-3 w-36"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filtered.map(item => {
                const isEditing = editing?.id === item.id
                const isMoving = movingId === item.id
                const pc = PRIORITY_CONFIG[item.priority]

                return (
                  <tr key={item.id} className="group hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-2">
                      <div className="font-medium text-white">{item.card.name_en}</div>
                      {item.card.name_it && (
                        <div className="text-xs text-gray-500">{item.card.name_it}</div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-400 max-w-36 truncate">{item.card.type_line}</td>
                    <td className="px-4 py-2 text-center font-mono text-gray-300">
                      {formatManaCost(item.card.mana_cost)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-xs capitalize ${rarityColor(item.card.rarity)}`}>
                        {item.card.rarity}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center text-gray-300 text-xs">
                      {item.card.price_eur != null ? (
                        <span>
                          €{item.card.price_eur.toFixed(2)}
                          {item.quantity_wanted > 1 && (
                            <span className="text-gray-500 ml-1">
                              × {item.quantity_wanted} = €{(item.card.price_eur * item.quantity_wanted).toFixed(2)}
                            </span>
                          )}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {isEditing ? (
                        <input
                          type="number" min={1} max={99}
                          value={editing.qty}
                          onChange={e => setEditing({ ...editing, qty: parseInt(e.target.value) || 1 })}
                          className="w-16 bg-gray-800 border border-purple-500 rounded px-2 py-0.5 text-white text-sm text-center focus:outline-none"
                        />
                      ) : (
                        <span className="text-white font-medium">{item.quantity_wanted}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {isEditing ? (
                        <select
                          value={editing.priority}
                          onChange={e => setEditing({ ...editing, priority: e.target.value as Priority })}
                          className="bg-gray-800 border border-gray-700 rounded text-xs text-white px-1 py-0.5 focus:outline-none focus:border-purple-500"
                        >
                          <option value="high">Alta</option>
                          <option value="medium">Media</option>
                          <option value="low">Bassa</option>
                        </select>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded border ${pc.color}`}>
                          {pc.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs max-w-48">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editing.notes}
                          onChange={e => setEditing({ ...editing, notes: e.target.value })}
                          placeholder="Note…"
                          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-white text-xs focus:outline-none focus:border-purple-500"
                        />
                      ) : (
                        <span className="truncate block">{item.notes ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <div className="flex gap-1 justify-center">
                          <Button size="sm" variant="primary" loading={saving} onClick={handleSave}>✓</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>✕</Button>
                        </div>
                      ) : (
                        <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditing({
                              id: item.id,
                              qty: item.quantity_wanted,
                              priority: item.priority,
                              notes: item.notes ?? '',
                            })}
                          >
                            Mod
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={isMoving}
                            title="Aggiungi alla collezione"
                            onClick={() => handleMoveToCollection(item.id)}
                          >
                            +Col
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)}>✕</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddToWishlistModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}

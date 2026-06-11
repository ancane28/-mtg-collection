'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { autocompleteCardName, fetchCardPrintings, getCardImageUrl, ScryfallCard } from '@/lib/scryfall/api'
import { addCardToCollection } from '@/app/(app)/collection/actions'

interface AddCardModalProps {
  open: boolean
  onClose: () => void
}

type Step = 'search' | 'printing'

interface PrintingOption {
  scryfall_print_id: string
  set_code: string
  set_name: string
  image_url: string
  has_foil: boolean
  has_nonfoil: boolean
}

function toPrintingOption(card: ScryfallCard): PrintingOption {
  return {
    scryfall_print_id: card.id,
    set_code: card.set,
    set_name: card.set_name,
    image_url: getCardImageUrl(card),
    has_foil: card.foil,
    has_nonfoil: card.nonfoil,
  }
}

export function AddCardModal({ open, onClose }: AddCardModalProps) {
  const [step, setStep] = useState<Step>('search')
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [printings, setPrintings] = useState<PrintingOption[]>([])
  const [loadingPrintings, setLoadingPrintings] = useState(false)
  const [selectedPrinting, setSelectedPrinting] = useState<PrintingOption | null>(null)
  const [isFoil, setIsFoil] = useState(false)

  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (selected || query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    const timer = setTimeout(async () => {
      const results = await autocompleteCardName(query)
      setSuggestions(results.slice(0, 8))
      setShowSuggestions(results.length > 0)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, selected])

  function selectCard(name: string) {
    setSelected(name)
    setQuery(name)
    setShowSuggestions(false)
  }

  async function goToPrintingStep() {
    if (!selected) return
    setLoadingPrintings(true)
    setError(null)
    const cards = await fetchCardPrintings(selected)
    setPrintings(cards.map(toPrintingOption))
    setLoadingPrintings(false)
    setStep('printing')
  }

  async function handleSubmit() {
    if (!selected) return
    setLoading(true)
    setError(null)
    const result = await addCardToCollection(selected, qty, selectedPrinting ?? undefined, isFoil)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      handleClose()
    }
  }

  function handleClose() {
    setStep('search')
    setQuery('')
    setSelected(null)
    setSuggestions([])
    setShowSuggestions(false)
    setPrintings([])
    setSelectedPrinting(null)
    setIsFoil(false)
    setQty(1)
    setError(null)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={handleClose} />
      <div className="relative z-10 bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg shadow-2xl mx-4">

        {step === 'search' ? (
          <>
            <h2 className="text-lg font-semibold text-white mb-4">Aggiungi carta</h2>

            <div className="space-y-4">
              <div className="relative">
                <label className="block text-xs text-gray-400 mb-1">Nome carta</label>
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setSelected(null) }}
                  placeholder="Es: Lightning Bolt"
                  className="w-full bg-gray-800/80 border border-gray-700/60 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
                {showSuggestions && (
                  <ul className="absolute z-20 w-full mt-1 bg-gray-800/80 border border-gray-700/60 rounded-lg overflow-hidden shadow-xl">
                    {suggestions.map(name => (
                      <li
                        key={name}
                        onMouseDown={() => selectCard(name)}
                        className="px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 cursor-pointer"
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Quantità</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={qty}
                  onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 bg-gray-800/80 border border-gray-700/60 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={handleClose}>Annulla</Button>
                <Button
                  type="button"
                  variant="secondary"
                  loading={loadingPrintings}
                  disabled={!selected}
                  onClick={goToPrintingStep}
                >
                  Scegli edizione…
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  loading={loading}
                  disabled={!selected}
                  onClick={handleSubmit}
                >
                  Aggiungi
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setStep('search')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-white">
                {selected} — scegli edizione
              </h2>
            </div>

            {printings.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">Nessuna stampa trovata</p>
            ) : (
              <div className="overflow-y-auto max-h-80 -mx-2 px-2">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {printings.map(p => {
                    const isSelected = selectedPrinting?.scryfall_print_id === p.scryfall_print_id
                    return (
                      <button
                        key={p.scryfall_print_id}
                        onClick={() => { setSelectedPrinting(isSelected ? null : p); setIsFoil(false) }}
                        className={`relative flex flex-col rounded-lg overflow-hidden border-2 transition-all ${
                          isSelected
                            ? 'border-orange-500 ring-1 ring-orange-500'
                            : 'border-gray-700 hover:border-gray-500'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image_url} alt={p.set_name} className="w-full h-auto" />
                        <div className="p-1 bg-gray-800">
                          <p className="text-[10px] text-gray-300 truncate leading-tight">{p.set_name}</p>
                          <p className="text-[10px] text-gray-500 uppercase">{p.set_code}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {selectedPrinting && (selectedPrinting.has_foil) && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-gray-400">Foil?</span>
                <button
                  onClick={() => setIsFoil(!isFoil)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    isFoil ? 'bg-orange-600' : 'bg-gray-700'
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    isFoil ? 'translate-x-4' : 'translate-x-1'
                  }`} />
                </button>
                {isFoil && <span className="text-xs text-orange-400">✨ Foil</span>}
              </div>
            )}

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={handleClose}>Annulla</Button>
              <Button
                variant="primary"
                loading={loading}
                disabled={!selected}
                onClick={handleSubmit}
              >
                {selectedPrinting
                  ? `Aggiungi ${qty}× ${selectedPrinting.set_name}${isFoil ? ' Foil' : ''}`
                  : 'Aggiungi senza edizione'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

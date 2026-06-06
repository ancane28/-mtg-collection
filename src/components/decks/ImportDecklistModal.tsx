'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { importDecklist } from '@/app/(app)/decks/actions'

interface ImportDecklistModalProps {
  open: boolean
  deckId: string
  onClose: () => void
  onImported: () => void
}

export function ImportDecklistModal({ open, deckId, onClose, onImported }: ImportDecklistModalProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    imported: number
    real: number
    proxy: number
    errors: string[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleImport() {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    const res = await importDecklist(deckId, text)
    setLoading(false)
    if ('error' in res) {
      setError(res.error ?? 'Errore sconosciuto')
      return
    }
    setResult(res)
    if (res.imported > 0) onImported()
  }

  function handleClose() {
    setText('')
    setResult(null)
    setError(null)
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) handleClose() }}
    >
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg mx-4">
        <h2 className="text-lg font-semibold text-white mb-1">Importa decklist</h2>
        <p className="text-sm text-gray-500 mb-4">
          Formato: <code className="text-gray-300 bg-gray-800 px-1 rounded">4 Lightning Bolt</code>, una carta per riga
        </p>

        {!result ? (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"1 Sol Ring\n4 Lightning Bolt\n2 Counterspell\n..."}
              className="w-full h-52 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono resize-none focus:outline-none focus:border-purple-500 mb-4"
              disabled={loading}
            />

            {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

            {loading && (
              <p className="text-sm text-purple-400 mb-3 animate-pulse">
                Ricerca su Scryfall in corso... (può richiedere qualche secondo)
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={handleClose} disabled={loading}>
                Annulla
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                loading={loading}
                onClick={handleImport}
                disabled={!text.trim()}
              >
                Importa
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-gray-800 rounded-xl">
              <Badge variant="real">REAL {result.real}</Badge>
              <Badge variant="proxy">PROXY {result.proxy}</Badge>
              <span className="text-sm text-gray-400 ml-auto">{result.imported} carte importate</span>
            </div>

            {result.errors.length > 0 && (
              <div className="p-3 bg-red-900/20 border border-red-800/40 rounded-lg">
                <p className="text-xs text-red-400 font-medium mb-1">
                  {result.errors.length} {result.errors.length === 1 ? 'carta non trovata' : 'carte non trovate'}:
                </p>
                <ul className="text-xs text-red-300 space-y-0.5 max-h-32 overflow-y-auto">
                  {result.errors.map((name, i) => (
                    <li key={i}>• {name}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button variant="primary" className="w-full" onClick={handleClose}>
              Chiudi
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

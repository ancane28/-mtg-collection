'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { importCollection } from '@/app/(app)/collection/actions'

interface ImportCollectionModalProps {
  open: boolean
  onClose: () => void
}

export function ImportCollectionModal({ open, onClose }: ImportCollectionModalProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleImport() {
    if (!text.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    const res = await importCollection(text)
    if ('error' in res && res.error) {
      setError(res.error)
    } else if ('imported' in res) {
      setResult({ imported: res.imported, errors: res.errors })
    }
    setLoading(false)
  }

  function handleClose() {
    setText('')
    setResult(null)
    setError(null)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col gap-4 p-6">
        <h2 className="text-lg font-semibold text-white">Importa collezione</h2>

        <p className="text-sm text-gray-400">
          Incolla la lista nel formato <span className="font-mono text-gray-300">N Nome Carta</span> (uno per riga).
          Le quantità vengono sommate alle carte già presenti.
        </p>

        <textarea
          className="w-full h-56 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-purple-500 font-mono"
          placeholder={"4 Lightning Bolt\n2 Counterspell\n1 Sol Ring"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
        />

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {result && (
          <div className="rounded-xl bg-gray-800 border border-gray-700 p-3 space-y-1">
            <p className="text-sm text-green-400 font-medium">{result.imported} carte importate</p>
            {result.errors.length > 0 && (
              <div>
                <p className="text-xs text-red-400 font-medium mb-1">{result.errors.length} non trovate:</p>
                <ul className="text-xs text-red-300 space-y-0.5 max-h-24 overflow-y-auto">
                  {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={handleClose}>Chiudi</Button>
          {!result && (
            <Button variant="primary" loading={loading} onClick={handleImport}>
              Importa
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

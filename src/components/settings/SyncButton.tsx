'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { syncCardsDatabase } from '@/app/(app)/settings/actions'

export function SyncButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported?: number; error?: string } | null>(null)

  async function handleSync() {
    setLoading(true)
    setResult(null)
    const res = await syncCardsDatabase()
    setLoading(false)
    setResult('error' in res ? { error: res.error } : { imported: res.imported })
    if ('imported' in res) router.refresh()
  }

  return (
    <div className="space-y-3">
      {loading && (
        <p className="text-sm text-orange-400 animate-pulse">
          Download in corso (~26 MB)... può richiedere 20–30 secondi
        </p>
      )}

      <Button variant="primary" loading={loading} onClick={handleSync}>
        Sincronizza database carte
      </Button>

      {result?.error && (
        <p className="text-sm text-red-400">{result.error}</p>
      )}
      {result?.imported != null && (
        <p className="text-sm text-green-400">
          ✓ {result.imported.toLocaleString('it-IT')} carte sincronizzate
        </p>
      )}
    </div>
  )
}

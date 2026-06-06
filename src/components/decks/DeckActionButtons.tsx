'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ImportDecklistModal } from './ImportDecklistModal'
import { AddCardToDeckModal } from './AddCardToDeckModal'
import { deleteDeck } from '@/app/(app)/decks/actions'

interface DeckActionButtonsProps {
  deckId: string
}

export function DeckActionButtons({ deckId }: DeckActionButtonsProps) {
  const router = useRouter()
  const [importOpen, setImportOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm('Eliminare questo mazzo? Le carte nella collezione non verranno rimosse.')) return
    setDeleting(true)
    await deleteDeck(deckId)
    router.push('/decks')
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
        + Carta
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setImportOpen(true)}>
        Importa
      </Button>
      <Button size="sm" variant="danger" loading={deleting} onClick={handleDelete}>
        Elimina
      </Button>

      <AddCardToDeckModal
        open={addOpen}
        deckId={deckId}
        onClose={() => setAddOpen(false)}
      />
      <ImportDecklistModal
        open={importOpen}
        deckId={deckId}
        onClose={() => setImportOpen(false)}
        onImported={() => router.refresh()}
      />
    </>
  )
}

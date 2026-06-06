'use client'

import { useState } from 'react'
import { SetCommanderModal } from './SetCommanderModal'
import { Card } from '@/types/database'

interface DeckCardRow {
  id: string
  card: Card
}

interface SetCommanderButtonProps {
  deckId: string
  currentCommanderId: string | null
  deckCards: DeckCardRow[]
}

export function SetCommanderButton({ deckId, currentCommanderId, deckCards }: SetCommanderButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-500 hover:text-purple-400 transition-colors underline underline-offset-2"
      >
        {currentCommanderId ? 'Cambia' : 'Imposta comandante'}
      </button>
      <SetCommanderModal
        open={open}
        deckId={deckId}
        currentCommanderId={currentCommanderId}
        deckCards={deckCards}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

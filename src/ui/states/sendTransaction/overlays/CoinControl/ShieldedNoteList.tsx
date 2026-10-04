import React from 'react'
import { PLATFORM_DASH_DECIMALS } from '../../../../../utils'
import type { ShieldedNote } from '../../types'
import { CoinRow } from './CoinRow'

interface ShieldedNoteListProps {
  notes: ShieldedNote[]
  selected: string[]
  rate: number | null
  onChange: (selected: string[]) => void
}

// Spendable shielded notes with a check per note; a note is always spent whole.
export function ShieldedNoteList ({ notes, selected, rate, onChange }: ShieldedNoteListProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-2'>
      {notes.map((note, index) => {
        const isSelected = selected.includes(note.noteId)
        return (
          <CoinRow
            key={note.noteId}
            address={note.address}
            amount={BigInt(note.amount)}
            decimals={PLATFORM_DASH_DECIMALS}
            rate={rate}
            selected={isSelected}
            meta={`Note #${index + 1}`}
            onToggle={() => onChange(isSelected ? selected.filter(id => id !== note.noteId) : [...selected, note.noteId])}
          />
        )
      })}
    </div>
  )
}

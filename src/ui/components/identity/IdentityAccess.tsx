import React from 'react'
import { Avatar, Checkbox, ChevronIcon, Identifier, Text } from 'dash-ui-kit/react'

interface IdentityAccessChipProps {
  selected: string[]
  total: number
  allSelected: boolean
  open: boolean
  onClick: () => void
  disabled?: boolean
}

interface IdentityChecklistProps {
  identities: string[]
  selected: string[]
  allSelected: boolean
  onToggle: (identifier: string) => void
  onToggleAll: () => void
  disabled?: boolean
}

const MAX_STACKED_AVATARS = 3

const selectionLabel = (selected: number, total: number, allSelected: boolean): string => {
  if (allSelected) return total === 1 ? 'your identity' : `all identities (${total})`
  if (selected === 0) return 'no identities'
  return `${selected} of ${total} identities`
}

/** Pill with stacked avatars and a summary of the identities a website can see; toggles the checklist. */
export function IdentityAccessChip ({ selected, total, allSelected, open, onClick, disabled = false }: IdentityAccessChipProps): React.JSX.Element {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      aria-expanded={open}
      className='flex items-center gap-1.5 min-w-0 pl-1 pr-2 py-0.5 rounded-full bg-white cursor-pointer disabled:cursor-default disabled:opacity-60'
    >
      <span className='flex -space-x-1.5 shrink-0'>
        {selected.slice(0, MAX_STACKED_AVATARS).map(identifier => (
          <Avatar key={identifier} username={identifier} className='size-4 rounded-full ring-2 ring-white bg-white' />
        ))}
      </span>
      <Text size='sm' weight='medium' className='truncate !text-dash-brand'>
        {selectionLabel(selected.length, total, allSelected)}
      </Text>
      <ChevronIcon className={`size-2.5 shrink-0 text-dash-brand transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  )
}

function ChecklistRow ({ checked, onToggle, disabled, children }: { checked: boolean, onToggle: () => void, disabled: boolean, children: React.ReactNode }): React.JSX.Element {
  return (
    <label className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl ${disabled ? 'opacity-60' : 'hover:bg-dash-primary-dark-blue/[0.03] cursor-pointer'}`}>
      {children}
      <Checkbox checked={checked} onChange={onToggle} disabled={disabled} shape='circle' size='sm' />
    </label>
  )
}

/** White list of wallet identities with checkboxes and an "All identities" row on top. */
export function IdentityChecklist ({ identities, selected, allSelected, onToggle, onToggleAll, disabled = false }: IdentityChecklistProps): React.JSX.Element {
  return (
    <div className='flex flex-col p-1 max-h-[9.5rem] overflow-y-auto rounded-xl bg-white'>
      {identities.length > 1 && (
        <ChecklistRow checked={allSelected} onToggle={onToggleAll} disabled={disabled}>
          <Text size='sm' weight='medium'>All identities</Text>
        </ChecklistRow>
      )}
      {identities.map(identifier => (
        <ChecklistRow key={identifier} checked={selected.includes(identifier)} onToggle={() => onToggle(identifier)} disabled={disabled}>
          <Identifier size='xs' avatar highlight='both' middleEllipsis edgeChars={5} className='min-w-0'>{identifier}</Identifier>
        </ChecklistRow>
      ))}
    </div>
  )
}

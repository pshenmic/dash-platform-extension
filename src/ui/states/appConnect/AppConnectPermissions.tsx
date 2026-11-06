import React, { useState } from 'react'
import { Avatar, CheckIcon, Checkbox, ChevronIcon, Identifier, Text } from 'dash-ui-kit/react'
import type { NetworkType } from '../../../types/NetworkType'

interface AppConnectPermissionsProps {
  identities: string[]
  selected: string[]
  allSelected: boolean
  onToggle: (identifier: string) => void
  onToggleAll: () => void
  network: NetworkType | null
}

interface PermissionProps {
  title: React.ReactNode
  description: string
  children?: React.ReactNode
}

const NETWORK_LABELS: Record<NetworkType, string> = { mainnet: 'Mainnet', testnet: 'Testnet' }
const MAX_STACKED_AVATARS = 3

function Permission ({ title, description, children }: PermissionProps): React.JSX.Element {
  return (
    <div className='flex items-start gap-3'>
      <div className='flex items-center justify-center size-6 shrink-0 rounded-full bg-white text-dash-brand'>
        <CheckIcon size={12} color='currentColor' />
      </div>
      <div className='flex flex-col gap-2 flex-1 min-w-0'>
        <div className='flex flex-col gap-0.5'>
          {typeof title === 'string' ? <Text size='sm' weight='medium'>{title}</Text> : title}
          <Text size='xs' weight='medium' dim>{description}</Text>
        </div>
        {children}
      </div>
    </div>
  )
}

function PickerRow ({ checked, onToggle, children }: { checked: boolean, onToggle: () => void, children: React.ReactNode }): React.JSX.Element {
  return (
    <label className='flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-dash-primary-dark-blue/[0.03] cursor-pointer'>
      {children}
      <Checkbox checked={checked} onChange={onToggle} shape='circle' size='sm' />
    </label>
  )
}

function selectionLabel (selected: number, total: number, allSelected: boolean): string {
  if (allSelected) return total === 1 ? 'your identity' : `all identities (${total})`
  if (selected === 0) return 'no identities'
  return `${selected} of ${total} identities`
}

// What a connected website gets: the picked identities with the network, and signing requests.
export function AppConnectPermissions ({ identities, selected, allSelected, onToggle, onToggleAll, network }: AppConnectPermissionsProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const networkLabel = network != null ? NETWORK_LABELS[network] : 'current'
  const hasIdentities = identities.length > 0

  // The title doubles as the identity selector: "See [all identities (3) v]".
  const identitiesTitle = hasIdentities
    ? (
      <div className='flex items-center gap-1.5 min-w-0'>
        <Text size='sm' weight='medium' className='shrink-0'>See</Text>
        <button
          type='button'
          onClick={() => setOpen(prev => !prev)}
          aria-expanded={open}
          className='flex items-center gap-1.5 min-w-0 pl-1 pr-2 py-0.5 rounded-full bg-white cursor-pointer'
        >
          <span className='flex -space-x-1.5 shrink-0'>
            {selected.slice(0, MAX_STACKED_AVATARS).map(identifier => (
              <Avatar key={identifier} username={identifier} className='size-4 rounded-full ring-2 ring-white bg-white' />
            ))}
          </span>
          <Text size='sm' weight='medium' className='truncate !text-dash-brand'>
            {selectionLabel(selected.length, identities.length, allSelected)}
          </Text>
          <ChevronIcon className={`size-2.5 shrink-0 text-dash-brand transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      )
    : 'See your identities'

  return (
    <div className='flex flex-col gap-3 p-4 rounded-3xl bg-dash-primary-dark-blue/[0.03]'>
      <Text size='sm' weight='medium' dim>This website will be able to:</Text>

      <Permission
        title={identitiesTitle}
        description={hasIdentities
          ? `Their identifiers and that you are on ${networkLabel} network`
          : 'This wallet has no identities yet'}
      >
        {open && hasIdentities && (
          <div className='flex flex-col p-1 max-h-[9.5rem] overflow-y-auto rounded-xl bg-white'>
            {identities.length > 1 && (
              <PickerRow checked={allSelected} onToggle={onToggleAll}>
                <Text size='sm' weight='medium'>All identities</Text>
              </PickerRow>
            )}
            {identities.map(identifier => (
              <PickerRow key={identifier} checked={selected.includes(identifier)} onToggle={() => onToggle(identifier)}>
                <Identifier size='xs' avatar highlight='both' middleEllipsis edgeChars={5} className='min-w-0'>{identifier}</Identifier>
              </PickerRow>
            ))}
          </div>
        )}
      </Permission>

      <Permission
        title='Request transaction signing'
        description='Nothing is sent without your approval and password'
      />
    </div>
  )
}

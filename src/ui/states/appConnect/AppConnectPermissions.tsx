import React, { useState } from 'react'
import { CheckIcon, Text } from 'dash-ui-kit/react'
import { IdentityMultiSelectChip, IdentityChecklist } from '../../components/identity'
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
        <IdentityMultiSelectChip
          selected={selected}
          total={identities.length}
          allSelected={allSelected}
          open={open}
          onClick={() => setOpen(prev => !prev)}
        />
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
          <IdentityChecklist identities={identities} selected={selected} allSelected={allSelected} onToggle={onToggle} onToggleAll={onToggleAll} />
        )}
      </Permission>

      <Permission
        title='Request transaction signing'
        description='Nothing is sent without your approval and password'
      />
    </div>
  )
}

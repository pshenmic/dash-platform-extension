import React from 'react'
import { Avatar, Identifier, OverlayMenu, Switch, Text } from 'dash-ui-kit/react'
import type { Identity } from '../../../types'
import type { TransactionsScope } from './types'

const SCOPE_OPTIONS = [
  { label: 'All', value: 'all' as const },
  { label: 'Core', value: 'core' as const },
  { label: 'Platform', value: 'platform' as const }
]

const ALL_IDENTITIES = 'all-identities'

function IdentityRow ({ identifier }: { identifier: string }): React.JSX.Element {
  return (
    <div className='flex items-center gap-2 min-w-0'>
      <div className='w-6 h-6 rounded-full overflow-hidden shrink-0'>
        <Avatar username={identifier} className='w-6 h-6' />
      </div>
      <Identifier highlight='both' middleEllipsis edgeChars={5} className='!text-sm'>
        {identifier}
      </Identifier>
    </div>
  )
}

function AllIdentitiesRow (): React.JSX.Element {
  return (
    <div className='flex items-center gap-2 min-w-0'>
      <div className='flex items-center justify-center w-6 h-6 rounded-full bg-[rgba(12,28,51,0.05)] shrink-0'>
        <Text size='xs' weight='bold' className='!leading-none !text-dash-primary-dark-blue/50'>A</Text>
      </div>
      <Text size='sm' weight='medium'>All Identities</Text>
    </div>
  )
}

interface ScopeSwitchProps {
  scope: TransactionsScope
  identityId: string | null
  identities: Identity[]
  onScopeChange: (scope: TransactionsScope) => void
  onIdentityChange: (identityId: string | null) => void
}

/**
 * Layer picker plus, on the Platform layer, an identity narrowing selector.
 * An identity scope is Platform filtered down, not a fourth layer.
 */
export function ScopeSwitch ({
  scope,
  identityId,
  identities,
  onScopeChange,
  onIdentityChange
}: ScopeSwitchProps): React.JSX.Element {
  const onPlatform = scope === 'platform' || scope === 'identity'
  const selected = scope === 'identity' && identityId != null && identityId !== '' ? identityId : null

  // Keep an identity from another wallet visible instead of silently dropping it.
  const known = identities.map(identity => identity.identifier)
  const rows = selected != null && !known.includes(selected) ? [selected, ...known] : known

  const items = [
    {
      id: ALL_IDENTITIES,
      content: <AllIdentitiesRow />,
      onClick: () => { onIdentityChange(null) }
    },
    ...rows.map(identifier => ({
      id: identifier,
      content: <IdentityRow identifier={identifier} />,
      onClick: () => { onIdentityChange(identifier) }
    }))
  ]

  return (
    <div className='flex flex-col gap-2'>
      <Switch
        size='sm'
        options={SCOPE_OPTIONS}
        value={scope === 'identity' ? 'platform' : scope}
        onChange={onScopeChange}
      />

      {onPlatform && rows.length > 0 && (
        <OverlayMenu
          overlayLabel='Identity'
          triggerContent={selected != null ? <IdentityRow identifier={selected} /> : <AllIdentitiesRow />}
          items={items}
          size='md'
          border
          showArrow
          className='!w-full'
        />
      )}
    </div>
  )
}

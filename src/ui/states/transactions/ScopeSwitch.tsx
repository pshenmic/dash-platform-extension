import React from 'react'
import { Avatar, Identifier, Switch, Text } from 'dash-ui-kit/react'
import type { TransactionsScope } from './types'

const SCOPE_OPTIONS = [
  { label: 'All', value: 'all' as const },
  { label: 'Core', value: 'core' as const },
  { label: 'Platform', value: 'platform' as const }
]

interface ScopeSwitchProps {
  scope: TransactionsScope
  identityId: string | null
  onScopeChange: (scope: TransactionsScope) => void
  onClearIdentity: () => void
}

/**
 * Layer picker. An identity scope narrows Platform further, so it shows as a
 * removable chip instead of a fourth segment.
 */
export function ScopeSwitch ({
  scope,
  identityId,
  onScopeChange,
  onClearIdentity
}: ScopeSwitchProps): React.JSX.Element {
  if (scope === 'identity' && identityId != null && identityId !== '') {
    return (
      <div className='flex items-center gap-2 py-1.5 pl-2 pr-1.5 rounded-[14px] bg-[rgba(12,28,51,0.04)] self-start max-w-full'>
        <div className='w-5 h-5 rounded-full overflow-hidden shrink-0'>
          <Avatar username={identityId} className='w-5 h-5' />
        </div>
        <Text size='xs' weight='medium' className='!text-dash-primary-dark-blue/50 shrink-0'>
          Identity
        </Text>
        <Identifier middleEllipsis edgeChars={5} highlight='both' className='!text-xs min-w-0'>
          {identityId}
        </Identifier>
        <button
          type='button'
          aria-label='Show all platform transactions'
          onClick={onClearIdentity}
          className='flex items-center justify-center size-5 rounded-full bg-[rgba(12,28,51,0.05)] hover:bg-[rgba(12,28,51,0.12)] transition-colors shrink-0 cursor-pointer border-0'
        >
          <Text size='xs' weight='medium' className='!leading-none !text-dash-primary-dark-blue/50'>x</Text>
        </button>
      </div>
    )
  }

  return (
    <Switch
      size='sm'
      options={SCOPE_OPTIONS}
      value={scope === 'identity' ? 'platform' : scope}
      onChange={onScopeChange}
    />
  )
}

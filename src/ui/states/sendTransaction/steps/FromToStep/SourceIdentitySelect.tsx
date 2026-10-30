import React from 'react'
import { Identifier, OverlayMenu, Text } from 'dash-ui-kit/react'
import { PLATFORM_DASH_DECIMALS } from '../../../../../utils'
import type { SourceBalance } from '../../hooks/useSourceBalance'
import type { SourceIdentity } from '../../types'
import { SourceBalanceLabel } from './SourceBalanceLabel'

interface SourceIdentitySelectProps {
  identities: SourceIdentity[]
  value: string | null
  onChange: (identityId: string) => void
  balance: SourceBalance
  rate: number | null
}

// Identity with its balance below, used for the chosen identity and for each list item.
function IdentityRow ({ identifier, balance, rate }: { identifier: string, balance: SourceBalance, rate: number | null }): React.JSX.Element {
  return (
    <div className='flex flex-col gap-1 min-w-0'>
      <Identifier weight='light' avatar highlight='both' middleEllipsis='auto' className='min-w-0 !text-[0.65625rem]'>{identifier}</Identifier>
      <SourceBalanceLabel balance={balance} rate={rate} />
    </div>
  )
}

const dashBalance = (amount: bigint | null): SourceBalance => ({ amount, decimals: PLATFORM_DASH_DECIMALS, unit: 'Dash', sourceAddress: null })

// Identity picker of the From card: the chosen identity and every list item show their balance.
export function SourceIdentitySelect ({ identities, value, onChange, balance, rate }: SourceIdentitySelectProps): React.JSX.Element {
  // Until DAPI answers, the chosen identity shows the faster list balance.
  const listBalance = identities.find(identity => identity.identifier === value)?.balance ?? null
  const valueBalance = balance.amount == null && balance.unit === 'Dash' ? dashBalance(listBalance) : balance

  return (
    <OverlayMenu
      triggerContent={(
        value != null
          ? <IdentityRow identifier={value} balance={valueBalance} rate={rate} />
          : <Text size='sm' dim>Select identity</Text>
      )}
      items={identities.map(identity => ({
        id: identity.identifier,
        content: <IdentityRow identifier={identity.identifier} balance={dashBalance(identity.balance)} rate={rate} />,
        onClick: () => { onChange(identity.identifier) },
        className: '[&>*]:w-full'
      }))}
      size='md'
      border={false}
      arrowClassName='text-dash-primary-dark-blue/48 dark:text-white/48'
      className='!w-full'
      contentClassName='!w-full'
      triggerClassName='gap-2 !px-3 !py-3 !rounded-2xl border border-dash-primary-dark-blue/24 !bg-transparent dark:border-white/24'
    />
  )
}

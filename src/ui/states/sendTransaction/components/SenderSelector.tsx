import React from 'react'
import { Text, Identifier, Select, ValueCard, Avatar, Button } from 'dash-ui-kit/react'
import { IdentitySelect } from '../../../components/identity'
import { creditsToUsdEquivalent } from '../../../../utils'
import type { Identity } from '../../../../types'
import type { SenderType, PlatformAddressEntry } from '../types'

// Horizontal padding of a Select item (dash-block-xl: 1.5625rem per side).
const SELECT_ITEM_INLINE_PADDING = '3.125rem'

// A fixed width (trigger width minus the item's inline padding) keeps the
// dropdown from stretching past the screen; combined with the [data-fit-trigger-width]
// rule in app.pcss, long identifiers wrap instead of overflowing.
const OPTION_STYLE: React.CSSProperties = { width: `calc(var(--radix-select-trigger-width) - ${SELECT_ITEM_INLINE_PADDING})` }

// Option content for an identity: avatar, full identifier, balance + USD.
function IdentityOptionContent ({ identifier, balance, loading, rate }: {
  identifier: string
  balance: bigint | undefined
  loading: boolean
  rate: number | null
}): React.JSX.Element {
  const usd = creditsToUsdEquivalent(balance, rate)
  return (
    <div data-fit-trigger-width className='flex items-center gap-2 min-w-0' style={OPTION_STYLE}>
      <div className='w-8 h-8 shrink-0'>
        <Avatar username={identifier} />
      </div>
      <div className='flex flex-col gap-1 min-w-0'>
        <Identifier linesAdjustment={false} highlight='both' disableCopy className='!text-[0.813rem]'>
          {identifier}
        </Identifier>
        <div className='flex items-center gap-2'>
          <div className='flex items-baseline gap-1'>
            <Text weight='bold' className='!text-[1rem]'>
              {loading ? 'Loading…' : balance != null ? balance.toLocaleString() : '—'}
            </Text>
            {balance != null && <Text className='!text-[0.75rem]' dim>Credits</Text>}
          </div>
          {usd != null && (
            <ValueCard border={false} size='xs' className='px-[0.313rem] py-[0.156rem]' colorScheme='lightGray'>
              <Text size='xs' weight='light' className='text-dash-primary-dark-blue !text-[0.625rem] !leading-[1.2]'>
                {usd}
              </Text>
            </ValueCard>
          )}
        </div>
      </div>
    </div>
  )
}

// Option content for a platform address: full address + balance.
function PlatformAddressOptionContent ({ address, balance }: {
  address: string
  balance: bigint | undefined
}): React.JSX.Element {
  return (
    <div data-fit-trigger-width className='flex flex-col gap-1 min-w-0' style={OPTION_STYLE}>
      <Identifier linesAdjustment={false} highlight='both' disableCopy className='!text-[0.813rem]'>
        {address}
      </Identifier>
      <div className='flex items-baseline gap-1'>
        {balance != null
          ? <Text weight='bold' className='!text-[0.8125rem]'>{balance.toLocaleString()}</Text>
          : <Text className='!text-[0.75rem]' dim>Loading balance…</Text>}
        {balance != null && <Text className='!text-[0.625rem]' dim>Credits</Text>}
      </div>
    </div>
  )
}

export interface SenderSelectorProps {
  senderType: SenderType
  onSenderTypeChange: (type: SenderType) => void
  availableIdentities: Identity[]
  senderIdentity: string | null
  onIdentityChange: (identifier: string) => void
  recipientIdentity: string | null
  identityBalances: Map<string, bigint>
  identityBalancesLoading: boolean
  platformAddresses: PlatformAddressEntry[]
  platformBalances: Map<string, bigint>
  selectedPlatformAddress: string | null
  onPlatformAddressChange: (address: string) => void
  rate: number | null
  shieldedPanel: React.ReactNode
}

const SENDER_TYPES: Array<{ id: SenderType, label: string }> = [
  { id: 'identity', label: 'Identity' },
  { id: 'platform', label: 'Platform address' },
  { id: 'shielded', label: 'Shielded balance' }
]

// Keep the selected sender button looking active while native disabled blocks re-clicks.
const SELECTED_SENDER_BUTTON_CLASS =
  'disabled:!opacity-100 disabled:!bg-dash-brand disabled:!text-white disabled:hover:!bg-dash-brand disabled:hover:!cursor-default'

/**
 * Sender picker for the platform credit flow: choose between spending from an
 * identity or from a platform address, then pick the specific source.
 */
export function SenderSelector ({
  senderType,
  onSenderTypeChange,
  availableIdentities,
  senderIdentity,
  onIdentityChange,
  recipientIdentity,
  identityBalances,
  identityBalancesLoading,
  platformAddresses,
  platformBalances,
  selectedPlatformAddress,
  onPlatformAddressChange,
  rate,
  shieldedPanel
}: SenderSelectorProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-2.5'>
      <Text size='md' className='text-dash-primary-dark-blue opacity-50' dim>
        Sender
      </Text>

      <div className='flex flex-wrap gap-2'>
        {SENDER_TYPES.map(option => {
          const isSelected = senderType === option.id

          return (
            <Button
              key={option.id}
              type='button'
              size='sm'
              colorScheme={isSelected ? 'lightBlue' : 'lightGray'}
              disabled={isSelected}
              className={`flex-auto whitespace-nowrap !normal-case ${isSelected ? SELECTED_SENDER_BUTTON_CLASS : ''}`}
              onClick={() => onSenderTypeChange(option.id)}
            >
              {option.label}
            </Button>
          )
        })}
      </div>

      {/* Sender detail */}
      {senderType === 'shielded'
        ? shieldedPanel
        : senderType === 'identity'
          ? (
            <IdentitySelect
              identities={availableIdentities
                .map(identity => identity.identifier)
                .filter(identifier => identifier !== recipientIdentity)}
              value={senderIdentity}
              onChange={onIdentityChange}
              renderOption={(identifier) => (
                <IdentityOptionContent
                  identifier={identifier}
                  balance={identityBalances.get(identifier)}
                  loading={identityBalancesLoading}
                  rate={rate}
                />
              )}
            />
            )
          : (
            <Select
              size='xl'
              value={selectedPlatformAddress ?? undefined}
              onChange={onPlatformAddressChange}
              placeholder='Select a platform address'
              options={platformAddresses.map(entry => ({
                value: entry.address,
                label: entry.address,
                content: (
                  <PlatformAddressOptionContent
                    address={entry.address}
                    balance={platformBalances.get(entry.address)}
                  />
                )
              }))}
            />
            )}
    </div>
  )
}

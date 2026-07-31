import React, { useEffect, useState } from 'react'
import { Text, Button, ValueCard, CircleProcessIcon, ShieldSmallIcon, Identifier, Select } from 'dash-ui-kit/react'
import { PasswordField } from '../../../components/forms'
import { creditsToUsdEquivalent } from '../../../../utils'
import { SHIELDED_MAX_SPEND_NOTES } from '../../../../constants'
import { ALL_SHIELDED_SOURCES } from '../types'
import type { ShieldedAddressEntry } from '../types'
import type { GetShieldedBalanceResponse } from '../../../../types/messages/response/GetShieldedBalanceResponse'

// Horizontal padding of a Select item (dash-block-xl: 1.5625rem per side).
const SELECT_ITEM_INLINE_PADDING = '3.125rem'

// Fixed width (trigger width minus the item's inline padding) so long shielded
// addresses wrap inside the dropdown instead of stretching it past the screen.
const OPTION_STYLE: React.CSSProperties = { width: `calc(var(--radix-select-trigger-width) - ${SELECT_ITEM_INLINE_PADDING})` }

// Shown when the resolved transfer can't honour a specific source address.
const SOURCE_IGNORED_NOTE = 'This transfer spends from the whole shielded balance — a specific source address applies to private transfers only.'

// Credits + note count line shared by every option of the source select.
function SourceAmountLine ({ balance, spendableNotes }: {
  balance: bigint
  spendableNotes: number
}): React.JSX.Element {
  return (
    <div className='flex items-baseline gap-2'>
      <div className='flex items-baseline gap-1'>
        <Text weight='bold' className='!text-[0.8125rem]'>{balance.toLocaleString()}</Text>
        <Text className='!text-[0.625rem]' dim>Credits</Text>
      </div>
      <Text className='!text-[0.625rem]' dim>
        {spendableNotes} {spendableNotes === 1 ? 'note' : 'notes'}
      </Text>
    </div>
  )
}

// Option content for one shielded address: the address and its balance. An
// address the wallet didn't derive is marked — its notes are still spendable,
// but it isn't one of the addresses shown in the settings list.
function ShieldedAddressOptionContent ({ entry }: { entry: ShieldedAddressEntry }): React.JSX.Element {
  return (
    <div data-fit-trigger-width className='flex flex-col gap-1 min-w-0' style={OPTION_STYLE}>
      <Identifier linesAdjustment={false} highlight='both' disableCopy className='!text-[0.813rem]'>
        {entry.address}
      </Identifier>
      <div className='flex items-baseline gap-2'>
        <SourceAmountLine balance={entry.balance} spendableNotes={entry.spendableNotes} />
        {entry.diversifierIndex === null && (
          <Text className='!text-[0.625rem]' dim>external</Text>
        )}
      </div>
    </div>
  )
}

export interface ShieldedSenderPanelProps {
  info: GetShieldedBalanceResponse | null
  addresses: ShieldedAddressEntry[]
  selectedAddress: string | null
  onAddressChange: (address: string | null) => void
  sourceSelectionSupported: boolean
  isUnlocking: boolean
  isWarmingProver: boolean
  error: string | null
  rate: number | null
  onUnlock: (password: string) => void
  onErrorClear: () => void
}

/**
 * Sender detail for the shielded balance.
 */
export function ShieldedSenderPanel ({
  info,
  addresses,
  selectedAddress,
  onAddressChange,
  sourceSelectionSupported,
  isUnlocking,
  isWarmingProver,
  error,
  rate,
  onUnlock,
  onErrorClear
}: ShieldedSenderPanelProps): React.JSX.Element {
  const [password, setPassword] = useState('')

  // Drop the typed password once the addresses are actually readable — keeping
  // it through a failed attempt lets the user fix a typo instead of retyping.
  useEffect(() => {
    if (info != null) setPassword('')
  }, [info])

  if (info == null) {
    return (
      <div className='flex flex-col gap-2.5'>
        <Text size='sm' dim>
          Enter your password to read your shielded addresses. It is needed again to sign the transfer.
        </Text>
        <PasswordField
          value={password}
          onChange={(value) => { setPassword(value); onErrorClear() }}
          placeholder='Your Password'
          error={error}
          variant='outlined'
        />
        <Button
          colorScheme='lightBlue'
          onClick={() => onUnlock(password)}
          disabled={isUnlocking || password === ''}
        >
          {isUnlocking ? 'Unlocking...' : 'Unlock shielded addresses'}
        </Button>
      </div>
    )
  }

  const balance = BigInt(info.balance)
  const usd = creditsToUsdEquivalent(balance, rate)
  const selectedEntry = addresses.find(entry => entry.address === selectedAddress) ?? null

  return (
    <div className='flex flex-col gap-2.5'>
      <div className='flex flex-col gap-2'>
        <div className='flex items-center gap-1.5'>
          <ShieldSmallIcon size={14} className='text-[rgba(12,28,51,0.5)]' />
          <Text size='sm' dim>Shielded balance</Text>
        </div>

        <div className='flex items-center gap-2'>
          <div className='flex items-baseline gap-1'>
            <Text weight='bold' className='!text-[1rem]'>{balance.toLocaleString()}</Text>
            <Text className='!text-[0.75rem]' dim>Credits</Text>
          </div>
          {usd != null && (
            <ValueCard border={false} size='xs' className='px-[0.313rem] py-[0.156rem]' colorScheme='lightGray'>
              <Text size='xs' weight='light' className='text-dash-primary-dark-blue !text-[0.625rem] !leading-[1.2]'>
                {usd}
              </Text>
            </ValueCard>
          )}
        </div>

        {isWarmingProver && (
          <div className='flex items-center gap-1.5'>
            <CircleProcessIcon className='w-3.5 h-3.5 text-dash-brand animate-spin shrink-0' />
            <Text className='!text-[0.7rem]' dim>
              Preparing the private prover - this makes the first transfer faster.
            </Text>
          </div>
        )}
      </div>

      {/* Source addresses — every shielded address of the wallet, each with its
          share of the pool balance (funded ones first). */}
      {addresses.length === 0
        ? (
          <Text className='!text-[0.7rem]' dim>
            No shielded addresses available.
          </Text>
          )
        : (
          <>
            <Text className='!text-[0.7rem]' dim>Spend from</Text>
            <Select
              size='xl'
              disabled={!sourceSelectionSupported}
              value={selectedAddress ?? ALL_SHIELDED_SOURCES}
              onChange={(value) => onAddressChange(value === ALL_SHIELDED_SOURCES ? null : value)}
              options={[
                {
                  value: ALL_SHIELDED_SOURCES,
                  label: 'All shielded addresses',
                  content: (
                    <div data-fit-trigger-width className='flex flex-col gap-1 min-w-0' style={OPTION_STYLE}>
                      <Text className='!text-[0.813rem]'>All shielded addresses</Text>
                      <SourceAmountLine balance={balance} spendableNotes={info.spendableNotes} />
                    </div>
                  )
                },
                ...addresses.map(entry => ({
                  value: entry.address,
                  label: entry.address,
                  content: <ShieldedAddressOptionContent entry={entry} />
                }))
              ]}
            />

            {!sourceSelectionSupported && (
              <Text className='!text-[0.7rem]' dim>{SOURCE_IGNORED_NOTE}</Text>
            )}

            {/* Empty addresses are listed too, so say why one can't be spent. */}
            {sourceSelectionSupported && selectedEntry != null && selectedEntry.spendableNotes === 0 && (
              <Text className='!text-[0.7rem]' dim>
                This address holds no unspent notes — nothing can be sent from it yet.
              </Text>
            )}

            {/* A spend can only consume a bounded number of notes, so an address
                may hold enough credits and still fail — warn before the proof. */}
            {sourceSelectionSupported && selectedEntry != null && selectedEntry.spendableNotes > SHIELDED_MAX_SPEND_NOTES && (
              <Text className='!text-[0.7rem]' dim>
                This address holds {selectedEntry.spendableNotes} notes, and a single transfer can spend at most {SHIELDED_MAX_SPEND_NOTES}. Large amounts may need the notes consolidated first.
              </Text>
            )}
          </>
          )}
    </div>
  )
}

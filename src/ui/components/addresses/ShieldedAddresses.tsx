import React, { useState } from 'react'
import { Text, Button, ValueCard, BigNumber, NotActive, ShieldSmallIcon } from 'dash-ui-kit/react'
import { PasswordGate } from '../forms'
import { ShieldedAddressItem } from './ShieldedAddressItem'
import { BalanceInfo } from '../data'
import { useShieldedAddresses } from '../../hooks/useShieldedAddresses'
import type { NetworkType } from '../../../types'

interface ShieldedAddressesProps {
  walletId?: string | null
  currentNetwork?: NetworkType | null
}

export const ShieldedAddresses: React.FC<ShieldedAddressesProps> = ({ currentNetwork, walletId }) => {
  const {
    rows,
    balance,
    balanceUnavailable,
    rate,
    hasLoaded,
    isLoading,
    isGenerating,
    error,
    load,
    generate
  } = useShieldedAddresses(currentNetwork, walletId)
  const [isCreating, setIsCreating] = useState(false)

  const handleGenerate = async (password: string): Promise<string | null> => {
    const generateError = await generate(password)

    if (generateError != null) return generateError

    setIsCreating(false)
    return null
  }

  return (
    <div className='flex flex-col gap-4'>
      <Text size='sm' dim>
        Your shielded (private) addresses. They share one account balance, shown per address below.
      </Text>

      {!hasLoaded && (
        <PasswordGate
          description='Enter your password to view shielded addresses.'
          submitLabel='Show Shielded Addresses'
          isPending={isLoading}
          onSubmit={load}
        />
      )}

      {error != null && (
        <ValueCard colorScheme='red' size='xl'>
          <Text size='sm' color='red'>{error}</Text>
        </ValueCard>
      )}

      {hasLoaded && error == null && (
        <>
          <ValueCard colorScheme='lightGray' size='xl'>
            <div className='flex flex-col gap-3 w-full'>
              {/* Header */}
              <div className='flex items-center gap-1.5'>
                <ShieldSmallIcon size={14} className='text-[rgba(12,28,51,0.5)]' />
                <Text size='sm' dim>Shielded balance</Text>
              </div>

              {balance != null
                ? (
                  <>
                    {/* Hero: credits */}
                    <div className='flex items-baseline gap-1.5'>
                      <Text weight='bold' monospace className='!text-[2rem] !leading-none text-dash-brand'>
                        <BigNumber className='!text-[2rem] gap-1'>
                          {balance.balance}
                        </BigNumber>
                      </Text>
                      <Text dim className='!text-[0.7rem]'>Credits</Text>
                    </div>

                    {/* Dash + USD equivalents pill (same style as the home balance) */}
                    <BalanceInfo
                      balanceState={{ loading: false, error: null, data: BigInt(balance.balance) }}
                      rateState={{ loading: false, error: null, data: rate }}
                    />

                    {/* Notes */}
                    <div className='grid grid-cols-2 gap-2 w-full'>
                      <div className='rounded-[10px] bg-[rgba(12,28,51,0.04)] px-2.5 py-2 flex flex-col gap-1'>
                        <Text dim className='!text-[0.7rem]'>Spendable notes:</Text>
                        <Text weight='medium' className='!text-base text-dash-primary-dark-blue'>{balance.spendableNotes}</Text>
                      </div>
                      <div className='rounded-[10px] bg-[rgba(12,28,51,0.04)] px-2.5 py-2 flex flex-col gap-1'>
                        <Text dim className='!text-[0.7rem]'>Total notes:</Text>
                        <Text weight='medium' className='!text-base text-dash-primary-dark-blue'>{balance.totalNotes}</Text>
                      </div>
                    </div>
                  </>
                  )
                : <NotActive>{balanceUnavailable ? 'Unavailable' : 'n/a'}</NotActive>}
            </div>
          </ValueCard>

          {rows.length === 0
            ? (
              <ValueCard colorScheme='lightGray' size='xl'>
                <Text size='sm' dim>No shielded addresses available</Text>
              </ValueCard>
              )
            : (
              <div className='flex flex-col gap-2'>
                {rows.map((item) => (
                  <ShieldedAddressItem key={item.address} item={item} />
                ))}
              </div>
              )}

          {isCreating
            ? (
              <PasswordGate
                description='Enter your password to show more shielded addresses.'
                submitLabel='Show addresses'
                pendingLabel='Loading...'
                isPending={isGenerating}
                onSubmit={handleGenerate}
                onCancel={() => setIsCreating(false)}
              />
              )
            : (
              <Button
                colorScheme='brand'
                onClick={() => setIsCreating(true)}
                disabled={isLoading || isGenerating}
              >
                Show more addresses
              </Button>
              )}
        </>
      )}
    </div>
  )
}

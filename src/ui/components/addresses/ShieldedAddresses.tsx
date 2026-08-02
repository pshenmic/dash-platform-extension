import React, { useEffect, useState } from 'react'
import { Text, Button, ValueCard, BigNumber, NotActive, ShieldSmallIcon } from 'dash-ui-kit/react'
import { PasswordField } from '../forms'
import { ShieldedAddressItem, type ShieldedAddressData } from './ShieldedAddressItem'
import { BalanceInfo } from '../data'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { usePlatformExplorerClient } from '../../hooks/usePlatformExplorerClient'
import { usePasswordCheck } from '../../hooks'
import type { NetworkType } from '../../../types'
import type { GetShieldedAddressesResponse } from '../../../types/messages/response/GetShieldedAddressesResponse'
import type { GetShieldedBalanceResponse } from '../../../types/messages/response/GetShieldedBalanceResponse'

type ShieldedAddressList = GetShieldedAddressesResponse['addresses']
type ShieldedBalance = GetShieldedBalanceResponse

interface ShieldedAddressesProps {
  currentNetwork?: NetworkType | null
}

const buildRows = (
  addresses: ShieldedAddressList,
  balance: ShieldedBalance | null
): ShieldedAddressData[] => {
  const unmatched = new Map((balance?.byAddress ?? []).map((entry) => [entry.address, entry]))

  const derived = addresses.map((item) => {
    const entry = unmatched.get(item.address)
    unmatched.delete(item.address)

    return {
      address: item.address,
      diversifierIndex: item.diversifierIndex,
      balance: balance == null ? null : entry?.balance ?? '0',
      spendableNotes: balance == null ? null : entry?.spendableNotes ?? 0
    }
  })

  const external = [...unmatched.values()].map((entry) => ({
    address: entry.address,
    diversifierIndex: entry.diversifierIndex,
    balance: entry.balance,
    spendableNotes: entry.spendableNotes
  }))

  return [...derived, ...external]
}

export const ShieldedAddresses: React.FC<ShieldedAddressesProps> = ({ currentNetwork }) => {
  const extensionAPI = useExtensionAPI()
  const platformExplorerClient = usePlatformExplorerClient()
  const { verify: verifyPassword, error: passwordError, setError: setPasswordError } = usePasswordCheck()
  const [password, setPassword] = useState('')
  const [addresses, setAddresses] = useState<ShieldedAddressList>([])
  const [balance, setBalance] = useState<ShieldedBalance | null>(null)
  const [balanceUnavailable, setBalanceUnavailable] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rate, setRate] = useState<number | null>(null)

  // USD rate per Dash. Fetched independently of the (password-gated) balance so
  // the equivalent is ready as soon as the balance loads.
  useEffect(() => {
    const network = currentNetwork ?? 'testnet'
    platformExplorerClient.fetchRate(network)
      .then(setRate)
      .catch(() => setRate(null))
  }, [currentNetwork, platformExplorerClient])

  const load = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    setBalanceUnavailable(false)

    try {
      if (!(await verifyPassword(password))) return

      const [addrResult, balanceResult] = await Promise.allSettled([
        extensionAPI.getShieldedAddresses(password),
        extensionAPI.getShieldedBalance(password)
      ])

      setPassword('')

      if (addrResult.status === 'rejected') {
        setError(addrResult.reason instanceof Error ? addrResult.reason.message : 'Failed to load shielded addresses')
        return
      }

      setAddresses(addrResult.value)
      setHasLoaded(true)

      if (balanceResult.status === 'fulfilled') {
        setBalance(balanceResult.value)
      } else {
        setBalanceUnavailable(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shielded addresses')
    } finally {
      setIsLoading(false)
    }
  }

  const rows = buildRows(addresses, balance)

  return (
    <div className='flex flex-col gap-4'>
      <Text size='sm' dim>
        Your shielded (private) addresses. They share one account balance, shown per address below.
      </Text>

      {!hasLoaded && (
        <div className='flex flex-col gap-4'>
          <Text size='sm' dim>
            Enter your password to view shielded addresses.
          </Text>
          <PasswordField
            value={password}
            onChange={(value) => { setPassword(value); setPasswordError(null) }}
            error={passwordError}
            autoFocus
          />
          <Button
            colorScheme='brand'
            onClick={() => { void load() }}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Show Shielded Addresses'}
          </Button>
        </div>
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
        </>
      )}
    </div>
  )
}

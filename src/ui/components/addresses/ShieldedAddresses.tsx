import React, { useState } from 'react'
import { Text, Button, ValueCard, BigNumber } from 'dash-ui-kit/react'
import { PasswordField } from '../forms'
import { ShieldedAddressItem } from './ShieldedAddressItem'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import type { GetShieldedAddressesResponse } from '../../../types/messages/response/GetShieldedAddressesResponse'
import type { GetShieldedBalanceResponse } from '../../../types/messages/response/GetShieldedBalanceResponse'

type ShieldedAddressList = GetShieldedAddressesResponse['addresses']
type ShieldedBalance = GetShieldedBalanceResponse

export const ShieldedAddresses: React.FC = () => {
  const extensionAPI = useExtensionAPI()
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [addresses, setAddresses] = useState<ShieldedAddressList>([])
  const [balance, setBalance] = useState<ShieldedBalance | null>(null)
  const [balanceUnavailable, setBalanceUnavailable] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async (): Promise<void> => {
    if (password === '') {
      setPasswordError('Password must be provided')
      return
    }

    setIsLoading(true)
    setPasswordError(null)
    setError(null)
    setBalanceUnavailable(false)

    try {
      const passwordCheck = await extensionAPI.checkPassword(password)
      if (!passwordCheck.success) {
        setPasswordError('Invalid password')
        return
      }

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

  return (
    <div className='flex flex-col gap-4'>
      <Text size='sm' dim>
        Your shielded (private) addresses. The balance is shared across all of them.
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
            <div className='grid grid-cols-[auto_1fr] gap-x-2 gap-y-2 items-baseline'>
              <Text size='sm' dim>Shielded balance:</Text>
              {balance != null
                ? (
                  <div className='flex items-baseline gap-1'>
                    <Text weight='medium' monospace className='!text-lg text-dash-primary-dark-blue'>
                      <BigNumber className='!text-lg gap-1'>
                        {balance.balance}
                      </BigNumber>
                    </Text>
                    <Text dim className='!text-[0.7rem]'>Credits</Text>
                  </div>
                  )
                : <Text size='sm' dim>{balanceUnavailable ? 'Unavailable' : 'n/a'}</Text>}

              {balance != null && (
                <>
                  <Text size='sm' dim>Spendable notes:</Text>
                  <Text weight='medium' className='!text-lg text-dash-primary-dark-blue'>{balance.spendableNotes}</Text>
                </>
              )}
            </div>
          </ValueCard>

          {addresses.length === 0
            ? (
              <ValueCard colorScheme='lightGray' size='xl'>
                <Text size='sm' dim>No shielded addresses available</Text>
              </ValueCard>
              )
            : (
              <div className='flex flex-col gap-2'>
                {addresses.map((item) => (
                  <ShieldedAddressItem key={`${item.diversifierIndex}-${item.address}`} address={item.address} />
                ))}
              </div>
              )}
        </>
      )}
    </div>
  )
}

import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { AddressCard, AddressCardBalance } from './AddressCard'

export interface ShieldedAddressData {
  address: string
  diversifierIndex: number | null
  balance: string | null
  spendableNotes: number | null
  loading?: boolean
}

interface ShieldedAddressItemProps {
  item: ShieldedAddressData
}

export const ShieldedAddressItem: React.FC<ShieldedAddressItemProps> = ({ item }) => {
  const loading = item.loading ?? false

  return (
    <AddressCard address={item.address}>
      <div className='flex flex-row items-start justify-between gap-4'>
        <div className='flex flex-col gap-0.5 min-w-0'>
          <Text size='sm' dim>
            Index:{' '}
            <span className='font-extrabold text-dash-primary-dark-blue'>
              {item.diversifierIndex ?? '—'}
            </span>
          </Text>

          {loading
            ? <Text size='sm' dim>Loading...</Text>
            : (
              <Text size='sm' dim>
                Spendable notes:{' '}
                <span className='font-extrabold text-dash-primary-dark-blue'>
                  {item.spendableNotes ?? 0}
                </span>
              </Text>
              )}
        </div>

        <AddressCardBalance balance={item.balance} loading={loading} />
      </div>
    </AddressCard>
  )
}

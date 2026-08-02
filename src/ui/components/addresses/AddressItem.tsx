import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { AddressCard, AddressCardBalance } from './AddressCard'

export interface AddressData {
  index: number
  derivationPath: string
  address: string
  balance: string | null
  totalTxs: number | null
  loading: boolean
}

interface AddressItemProps {
  item: AddressData
  explorerUrl: string
}

export const AddressItem: React.FC<AddressItemProps> = ({ item, explorerUrl }) => (
  <AddressCard address={item.address} explorerUrl={explorerUrl}>
    {/* Bottom: transactions + credits in two columns */}
    <div className='flex flex-row items-start justify-between gap-4'>
      <div className='flex flex-col gap-0.5 min-w-0'>
        {item.loading
          ? <Text size='sm' dim>Loading...</Text>
          : (
            <Text size='sm' dim>
              Transactions: <span className='font-extrabold text-dash-primary-dark-blue'>{item.totalTxs ?? 0}</span>
            </Text>
            )}
      </div>

      <AddressCardBalance balance={item.balance} loading={item.loading} />
    </div>
  </AddressCard>
)

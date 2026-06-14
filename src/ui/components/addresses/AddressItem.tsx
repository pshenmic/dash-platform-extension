import React from 'react'
import { Text, Identifier, ValueCard, BigNumber } from 'dash-ui-kit/react'
import { WebIcon } from 'dash-ui-kit/react'

export interface AddressData {
  keyId: number
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
  <div className='bg-gray-100 rounded-2xl p-3 flex items-center justify-between gap-3'>
    <div className='flex flex-col gap-1 min-w-0 flex-1'>
      <div className='flex items-center gap-1.5'>
        <Identifier
          middleEllipsis
          edgeChars={5}
          copyButton
          avatar
        >
          {item.address}
        </Identifier>
        <a
          href={explorerUrl}
          target='_blank'
          rel='noreferrer'
          className='flex items-center justify-center w-5 h-5 rounded-[5px] bg-white/80 hover:bg-white transition-colors shrink-0'
          aria-label='View in explorer'
        >
          <WebIcon size={10} className='text-dash-primary-dark-blue' />
        </a>
      </div>

      {item.loading
        ? (
          <Text size='sm' dim>Loading...</Text>
          )
        : (
          <Text size='sm' dim>
            Transactions: <span className='font-semibold text-dash-primary-dark-blue'>{item.totalTxs ?? 0}</span>
          </Text>
          )}
    </div>

    <div className='flex flex-col items-end gap-0.5 shrink-0'>
      {item.loading
        ? (
          <Text size='sm' dim>...</Text>
          )
        : item.balance != null
          ? (
            <>
              <Text size='sm' weight='medium' monospace className='text-dash-primary-dark-blue text-right'>
                <BigNumber className='!text-[0.75rem] gap-1'>
                  {item.balance}
                </BigNumber>
              </Text>
              <Text className='!text-[0.7rem]' dim>Credits</Text>
            </>
            )
          : (
            <Text size='sm' dim>N/A</Text>
            )}
    </div>
  </div>
)

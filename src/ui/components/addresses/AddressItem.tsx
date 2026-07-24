import React from 'react'
import { Text, Identifier, BigNumber, ExternalLinkIcon, CopyButton } from 'dash-ui-kit/react'

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

const ICON_CLASS = 'flex items-center justify-center p-[3px] bg-[rgba(12,28,51,0.05)] rounded-[5px] shrink-0 hover:bg-[rgba(12,28,51,0.1)] transition-colors cursor-pointer'
const ICON_COLOR = 'text-[rgba(12,28,51,0.5)]'

export const AddressItem: React.FC<AddressItemProps> = ({ item, explorerUrl }) => {
  return (
    <div className='rounded-[15px] p-3 flex flex-col gap-2 bg-[rgba(12,28,51,0.03)]'>
      {/* Top: full-width address */}
      <div className='flex items-center gap-2 min-w-0'>
        <Identifier highlight='both' linesAdjustment={false}>
          {item.address}
        </Identifier>

        <CopyButton text={item.address} className='shrink-0' />

        <a
          href={explorerUrl}
          target='_blank'
          rel='noreferrer'
          className={ICON_CLASS}
          aria-label='View in explorer'
        >
          <ExternalLinkIcon size={14} className={ICON_COLOR} />
        </a>
      </div>

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

        <div className='flex items-end gap-0.5 shrink-0'>
          {item.loading
            ? <Text size='sm' dim>...</Text>
            : item.balance != null
              ? (
                <>
                  <Text size='sm' weight='medium' monospace className='text-dash-primary-dark-blue'>
                    <BigNumber className='!text-[0.75rem] gap-1'>
                      {item.balance}
                    </BigNumber>
                  </Text>
                  <Text className='!text-[0.7rem]' dim>Credits</Text>
                </>
                )
              : <Text size='sm' dim>n/a</Text>}
        </div>
      </div>
    </div>
  )
}

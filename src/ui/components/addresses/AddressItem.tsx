import React, { useState } from 'react'
import { Text, Identifier, BigNumber, ExternalLinkIcon, CopyIcon, Tooltip } from 'dash-ui-kit/react'

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

const ICON_CLASS = 'flex items-center justify-center p-[3px] bg-[rgba(12,28,51,0.05)] rounded-[5px] shrink-0 hover:bg-[rgba(12,28,51,0.1)] transition-colors cursor-pointer'
const ICON_COLOR = 'text-[rgba(12,28,51,0.5)]'

export const AddressItem: React.FC<AddressItemProps> = ({ item, explorerUrl }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = (): void => {
    navigator.clipboard.writeText(item.address).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }


  return (
  <div className='rounded-[15px] p-3 flex flex-row items-center justify-between gap-4 bg-[rgba(12,28,51,0.03)]'>
    {/* Left: address + transactions */}
    <div className='flex flex-row items-center gap-2 flex-1 min-w-0'>
      <div className='flex flex-col gap-0.5 min-w-0'>
        <div className='flex items-center gap-2'>
          <Identifier
            avatar
            middleEllipsis
            edgeChars={5}
          >
            {item.address}
          </Identifier>

          <Tooltip
            content='Copied!'
            side='top'
            sideOffset={4}
            open={copied}
            onOpenChange={(open) => { if (!open) setCopied(false) }}
          >
            <button
              onClick={handleCopy}
              className={ICON_CLASS}
              aria-label='Copy address'
            >
              <span className='w-[14px] h-[14px] flex items-center justify-center overflow-hidden'>
                <CopyIcon size={14} className={ICON_COLOR} />
              </span>
            </button>
          </Tooltip>

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

        {item.loading
          ? <Text size='sm' dim>Loading...</Text>
          : (
            <Text size='sm' dim>
              Transactions: <span className='font-extrabold text-dash-primary-dark-blue'>{item.totalTxs ?? 0}</span>
            </Text>
            )}
      </div>
    </div>

    {/* Right: balance */}
    <div className='flex flex-col items-end gap-0.5 shrink-0'>
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
  )
}

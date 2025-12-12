import React from 'react'
import { ValueCard, Accordion } from 'dash-ui-kit/react'
import TransactionHashBlock from './TransactionHashBlock'
import { TransactionFieldRow } from './TransactionFieldRow'
import { TransactionDetailsCard } from './TransactionDetailsCard'
import { TransactionTypesInfo, type TransactionTypeCode } from '../../../enums/TransactionTypes'

interface TransactionInfoSectionProps {
  transactionHash?: string
  network: 'testnet' | 'mainnet'
  transactionType?: string
  timestamp?: string
  blockHash?: string
  blockHeight?: number
  index?: number
  status?: string
}

export function TransactionInfoSection ({
  transactionHash,
  network,
  transactionType,
  timestamp,
  blockHash,
  blockHeight,
  index,
  status
}: TransactionInfoSectionProps): React.JSX.Element {
  return (
    <Accordion
      title='Transaction Info'
      showSeparator
    >
      <div className='flex flex-col gap-2.5'>
        {transactionHash != null && (
          <TransactionHashBlock
            hash={transactionHash}
            network={network}
            variant='compact'
            showActions
            label='Hash'
            shadow
            colorScheme='white'
          />
        )}

        <div className='flex gap-2.5'>
          {timestamp != null && (
            <div className='flex-1'>
              <TransactionDetailsCard title='Timestamp:'>
                {timestamp}
              </TransactionDetailsCard>
            </div>
          )}
          {transactionType != null && (
            <div className='flex-1'>
              <TransactionDetailsCard title='Type:'>
                {TransactionTypesInfo[transactionType as TransactionTypeCode]?.title ?? transactionType}
              </TransactionDetailsCard>
            </div>
          )}
        </div>

        {blockHash != null && (
          <TransactionHashBlock
            hash={blockHash}
            network={network}
            variant='compact'
            showActions
            label={`Block Hash${blockHeight != null ? ` (Height: ${blockHeight})` : ''}`}
            shadow
            colorScheme='white'
          />
        )}

        {(index != null || status != null) && (
          <ValueCard colorScheme='lightGray' size='lg' border={false}>
            <div className='flex flex-col gap-2.5'>
              {index != null && (
                <TransactionFieldRow label='Index:' value={index} />
              )}
              {status != null && (
                <TransactionFieldRow label='Status:' value={status} />
              )}
            </div>
          </ValueCard>
        )}
      </div>
    </Accordion>
  )
}

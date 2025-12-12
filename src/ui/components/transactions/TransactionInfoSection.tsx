import React from 'react'
import { ValueCard, Accordion, Text, Identifier } from 'dash-ui-kit/react'
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
      showSeparator={false}
    >
      <div className='flex flex-col gap-2.5'>
        {transactionHash != null && (
          <TransactionDetailsCard title='Hash'>
            <Identifier
              highlight='both'
              copyButton
              edgeChars={5}
              middleEllipsis={true}
              linesAdjustment={false}
              className='max-w-full !text-[1.25rem]'
            >
              {transactionHash}
            </Identifier>
          </TransactionDetailsCard>
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
                <Text size='sm'>
                  {TransactionTypesInfo[transactionType as TransactionTypeCode]?.title ?? transactionType}
                </Text>
              </TransactionDetailsCard>
            </div>
          )}
        </div>

        {blockHash != null && (
          <TransactionDetailsCard title={`Block Hash${blockHeight != null ? ` (Height: ${blockHeight})` : ''}`}>
            <Identifier
              highlight='both'
              copyButton
              ellipsis
            >
              {blockHash}
            </Identifier>
          </TransactionDetailsCard>
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

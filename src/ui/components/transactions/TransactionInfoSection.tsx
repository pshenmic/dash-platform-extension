import React from 'react'
import { Accordion, Text, Identifier } from 'dash-ui-kit/react'
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
              middleEllipsis
              linesAdjustment={false}
              className='max-w-full !text-[1.25rem] flex-1'
            >
              {transactionHash}
            </Identifier>
          </TransactionDetailsCard>
        )}

        {/* Timestamp + Type */}
        {(timestamp != null || transactionType != null) && (
          <div className='flex gap-2.5'>
            {timestamp != null && (
              <TransactionDetailsCard className='flex-1' title='Timestamp:'>
                <Text className='!text-[0.875rem] !font-medium text-dash-primary-dark-blue'>
                  {timestamp}
                </Text>
              </TransactionDetailsCard>
            )}
            {transactionType != null && (
              <TransactionDetailsCard className='flex-1' title='Type:'>
                <Text className='!text-[0.875rem] !font-medium text-dash-primary-dark-blue'>
                  {TransactionTypesInfo[transactionType as TransactionTypeCode]?.title ?? transactionType}
                </Text>
              </TransactionDetailsCard>
            )}
          </div>
        )}

        {/* Block Hash */}
        {blockHash != null && (
          <TransactionDetailsCard title={`Block Hash${blockHeight != null ? ` (Height: ${blockHeight})` : ''}`}>
            <Identifier
              highlight='both'
              copyButton
              middleEllipsis
              edgeChars={5}
              linesAdjustment={false}
              className='!text-[1.25rem] flex-1'
            >
              {blockHash}
            </Identifier>
          </TransactionDetailsCard>
        )}

        {/* Index + Status */}
        {(index != null || status != null) && (
          <div className='flex gap-2.5'>
            {index != null && (
              <TransactionDetailsCard className='flex-1' title='Index:'>
                <Text className='!text-[0.875rem] !font-medium text-dash-primary-dark-blue'>
                  {index}
                </Text>
              </TransactionDetailsCard>
            )}
            {status != null && (
              <TransactionDetailsCard className='flex-1' title='Status:'>
                <Text className='!text-[1.25rem] !font-medium text-dash-brand font-["Space_Grotesk"]'>
                  {status}
                </Text>
              </TransactionDetailsCard>
            )}
          </div>
        )}
      </div>
    </Accordion>
  )
}

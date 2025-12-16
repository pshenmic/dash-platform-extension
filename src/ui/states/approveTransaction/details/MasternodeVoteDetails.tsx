import React from 'react'
import { Text, Identifier, ValueCard } from 'dash-ui-kit/react'
import { TransactionDetailsCard } from '../../../components/transactions'
import { VoteChoiceCard } from '../../../components/cards'

interface MasternodeVoteDetailsProps {
  data: any
}

export function MasternodeVoteDetails ({ data }: MasternodeVoteDetailsProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-2.5'>
      <TransactionDetailsCard title='Pro TX Hash'>
        <Identifier className='!text-[1.25rem]' avatar copyButton middleEllipsis edgeChars={5}>
          {data.proTxHash}
        </Identifier>
      </TransactionDetailsCard>

      <TransactionDetailsCard title='Data Contract'>
        <Identifier className='!text-[1.25rem]' avatar copyButton middleEllipsis edgeChars={5}>
          {data.contractId}
        </Identifier>
      </TransactionDetailsCard>

      <div className='flex gap-2.5'>
        <TransactionDetailsCard className='flex-1' title='Document Type'>
          <Text size='sm'>
            {data.documentTypeName}
          </Text>
        </TransactionDetailsCard>
        <TransactionDetailsCard className='flex-1' title='Index Name'>
          <Text size='sm'>
            {data.indexName}
          </Text>
        </TransactionDetailsCard>
      </div>

      <TransactionDetailsCard title='Voter Identity'>
        <Identifier className='!text-[1.25rem]' avatar copyButton middleEllipsis edgeChars={5}>
          {data.ownerId}
        </Identifier>
      </TransactionDetailsCard>

      {data.choice != null && (
        <TransactionDetailsCard title='Choice'>
          <VoteChoiceCard choiceStr={data.choice} />
        </TransactionDetailsCard>
      )}

      {data.indexValues != null && data.indexValues.length > 0 && (
        <TransactionDetailsCard title='Index Values'>
          <ValueCard
            className='flex flex-col !items-stretch gap-2.5 !p-4'
            colorScheme='white'
            size='md'
            border
          >
            <div className='flex justify-between'>
              <Text dim className='text-[0.75rem]'>Base 64:</Text>
              <Text dim className='text-[0.75rem]'>Decoded:</Text>
            </div>
            {data.indexValues.map((value: string, index: number) => {
              try {
                const decoded = Buffer.from(value, 'base64').toString('utf-8')
                return (
                  <div key={index} className='flex justify-between'>
                    <Text size='sm' weight='medium'>{value}</Text>
                    <Text size='sm' className='opacity-70'>{decoded}</Text>
                  </div>
                )
              } catch {
                return (
                  <Text key={index} size='sm' weight='medium'>{value}</Text>
                )
              }
            })}
          </ValueCard>
        </TransactionDetailsCard>
      )}

      {data.modifiedDataIds != null && data.modifiedDataIds.length > 0 && (
        <div className='flex flex-col gap-2.5'>
          {data.modifiedDataIds.map((id: string, index: number) => (
            <TransactionDetailsCard key={index} title={`Modified Data ID ${index + 1}`}>
              <Identifier className='!text-[1.25rem]' avatar copyButton middleEllipsis edgeChars={5}>
                {id}
              </Identifier>
            </TransactionDetailsCard>
          ))}
        </div>
      )}
    </div>
  )
}

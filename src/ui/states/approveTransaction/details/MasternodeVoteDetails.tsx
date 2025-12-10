import React from 'react'
import { Text, ValueCard } from 'dash-ui-kit/react'
import { TransactionField, TransactionFieldRow } from '../../../components/transactions'

interface MasternodeVoteDetailsProps {
  data: any
}

export function MasternodeVoteDetails ({ data }: MasternodeVoteDetailsProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-2.5'>
      <TransactionField
        label='Pro TX Hash:'
        value={data.proTxHash}
        valueType='identifier'
      />

      <TransactionField
        label='Data Contract:'
        value={data.contractId}
        valueType='identifier'
      />

      <ValueCard colorScheme='lightGray' size='lg' border={false}>
        <div className='flex flex-col gap-2.5'>
          <TransactionFieldRow label='Document Type:' value={data.documentTypeName} />
          <TransactionFieldRow label='Index Name:' value={data.indexName} />
        </div>
      </ValueCard>

      <TransactionField
        label='Voter Identity:'
        value={data.ownerId}
        valueType='identifier'
      />

      {data.choice != null && (
        <ValueCard colorScheme='lightGray' size='lg' border={false}>
          <div className='flex flex-col gap-2.5'>
            <Text size='sm' className='opacity-50'>Choice:</Text>
            <ValueCard colorScheme='lightGray' size='md' border={false}>
              <Text size='sm'>{data.choice}</Text>
            </ValueCard>
          </div>
        </ValueCard>
      )}

      {data.indexValues != null && data.indexValues.length > 0 && (
        <ValueCard colorScheme='lightGray' size='lg' border={false}>
          <div className='flex flex-col gap-2.5'>
            <Text size='sm' className='opacity-50'>Index Values:</Text>
            <ValueCard colorScheme='lightGray' size='md' border={false}>
              <div className='flex flex-col gap-2.5'>
                <div className='flex justify-between'>
                  <Text size='xs' className='opacity-50'>Base 64:</Text>
                  <Text size='xs' className='opacity-50'>Decoded:</Text>
                </div>
                {data.indexValues.map((value: string, index: number) => {
                  try {
                    const decoded = Buffer.from(value, 'base64').toString('utf-8')
                    return (
                      <div key={index} className='flex justify-between'>
                        <Text size='sm' weight='medium'>{value}</Text>
                        <Text size='xs' className='opacity-70'>{decoded}</Text>
                      </div>
                    )
                  } catch {
                    return (
                      <Text key={index} size='sm' weight='medium'>{value}</Text>
                    )
                  }
                })}
              </div>
            </ValueCard>
          </div>
        </ValueCard>
      )}

      {data.modifiedDataIds != null && data.modifiedDataIds.length > 0 && (
        <div className='flex flex-col gap-1.5'>
          <Text size='sm' weight='medium' className='opacity-50'>Modified Data IDs:</Text>
          {data.modifiedDataIds.map((id: string, index: number) => (
            <TransactionField
              key={index}
              label={`${index + 1}.`}
              value={id}
              valueType='identifier'
            />
          ))}
        </div>
      )}
    </div>
  )
}


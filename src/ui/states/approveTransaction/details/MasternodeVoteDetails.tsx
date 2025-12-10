import React from 'react'
import { Text } from 'dash-ui-kit/react'

interface MasternodeVoteDetailsProps {
  data: any
}

export function MasternodeVoteDetails ({ data }: MasternodeVoteDetailsProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-2'>
      <Text size='md' weight='medium'>Masternode Vote</Text>
      <div className='flex flex-col gap-1'>
        <Text size='sm'>Type: {data.typeString}</Text>
        <Text size='sm'>Owner ID: {data.ownerId}</Text>
        <Text size='sm'>Contract ID: {data.contractId}</Text>
        <Text size='sm'>Document Type Name: {data.documentTypeName}</Text>
        <Text size='sm'>Index Name: {data.indexName}</Text>
        <Text size='sm'>Choice: {data.choice}</Text>
        <Text size='sm'>Pro Tx Hash: {data.proTxHash}</Text>
        <Text size='sm'>Signature Public Key ID: {data.signaturePublicKeyId}</Text>
        
        {data.indexValues != null && data.indexValues.length > 0 && (
          <>
            <Text size='sm' weight='medium'>Index Values:</Text>
            {data.indexValues.map((value: string, index: number) => (
              <Text key={index} size='sm' className='ml-4'>
                {index + 1}. {value}
              </Text>
            ))}
          </>
        )}

        {data.modifiedDataIds != null && data.modifiedDataIds.length > 0 && (
          <>
            <Text size='sm' weight='medium'>Modified Data IDs:</Text>
            {data.modifiedDataIds.map((id: string, index: number) => (
              <Text key={index} size='sm' className='ml-4'>
                {index + 1}. {id}
              </Text>
            ))}
          </>
        )}
      </div>
    </div>
  )
}


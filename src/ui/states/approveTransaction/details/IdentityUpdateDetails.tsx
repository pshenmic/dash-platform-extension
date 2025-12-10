import React from 'react'
import { Text } from 'dash-ui-kit/react'

interface IdentityUpdateDetailsProps {
  data: any
}

export function IdentityUpdateDetails ({ data }: IdentityUpdateDetailsProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-2'>
      <Text size='md' weight='medium'>Identity Update</Text>
      <div className='flex flex-col gap-1'>
        <Text size='sm'>Type: {data.typeString}</Text>
        <Text size='sm'>Identity ID: {data.identityId}</Text>
        <Text size='sm'>Revision: {data.revision}</Text>
        <Text size='sm'>Identity Nonce: {data.identityNonce}</Text>
        <Text size='sm'>User Fee Increase: {data.userFeeIncrease}</Text>
        <Text size='sm'>Signature Public Key ID: {data.signaturePublicKeyId}</Text>
        
        {data.publicKeysToAdd != null && data.publicKeysToAdd.length > 0 && (
          <>
            <Text size='sm' weight='medium'>Public Keys to Add ({data.publicKeysToAdd.length}):</Text>
            {data.publicKeysToAdd.map((key: any, index: number) => (
              <div key={index} className='flex flex-col gap-1 ml-4'>
                <Text size='sm' weight='medium'>Key {index + 1}:</Text>
                <Text size='sm'>ID: {key.id}</Text>
                <Text size='sm'>Type: {key.type}</Text>
                <Text size='sm'>Purpose: {key.purpose}</Text>
                <Text size='sm'>Security Level: {key.securityLevel}</Text>
                <Text size='sm'>Read Only: {key.readOnly ? 'Yes' : 'No'}</Text>
                <Text size='sm'>Data: {key.data}</Text>
                <Text size='sm'>Public Key Hash: {key.publicKeyHash}</Text>
              </div>
            ))}
          </>
        )}

        {data.publicKeyIdsToDisable != null && data.publicKeyIdsToDisable.length > 0 && (
          <>
            <Text size='sm' weight='medium'>Public Key IDs to Disable:</Text>
            <Text size='sm'>{data.publicKeyIdsToDisable.join(', ')}</Text>
          </>
        )}
      </div>
    </div>
  )
}


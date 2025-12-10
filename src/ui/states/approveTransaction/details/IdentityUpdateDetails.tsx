import React from 'react'
import { Text, ValueCard } from 'dash-ui-kit/react'
import { TransactionField, TransactionFieldRow } from '../../../components/transactions'

interface IdentityUpdateDetailsProps {
  data: any
}

export function IdentityUpdateDetails ({ data }: IdentityUpdateDetailsProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-2.5'>
      <TransactionField
        label='Identity ID:'
        value={data.identityId}
        valueType='identifier'
      />

      <ValueCard colorScheme='lightGray' size='lg' border={false}>
        <div className='flex flex-col gap-2.5'>
          <TransactionFieldRow label='Revision:' value={data.revision} />
          <TransactionFieldRow label='Identity Nonce:' value={data.identityNonce} />
          <TransactionFieldRow label='User Fee Increase:' value={data.userFeeIncrease} />
          <TransactionFieldRow label='Signature Public Key ID:' value={data.signaturePublicKeyId} />
        </div>
      </ValueCard>

      {data.publicKeysToAdd != null && data.publicKeysToAdd.length > 0 && (
        <div className='flex flex-col gap-2.5'>
          <Text size='sm' weight='medium' className='opacity-50'>Public Keys to Add ({data.publicKeysToAdd.length}):</Text>
          {data.publicKeysToAdd.map((key: any, index: number) => (
            <ValueCard key={index} colorScheme='lightGray' size='lg' border={false}>
              <div className='flex flex-col gap-2.5'>
                <Text size='sm' weight='medium'>Key {index + 1}</Text>
                <TransactionFieldRow label='ID:' value={key.id} />
                <TransactionFieldRow label='Type:' value={key.type} />
                <TransactionFieldRow label='Purpose:' value={key.purpose} />
                <TransactionFieldRow label='Security Level:' value={key.securityLevel} />
                <TransactionFieldRow label='Read Only:' value={key.readOnly ? 'Yes' : 'No'} />
                <div className='flex flex-col gap-1.5'>
                  <Text size='sm' className='opacity-50'>Data:</Text>
                  <Text size='xs' className='break-all font-mono'>{key.data}</Text>
                </div>
                <div className='flex flex-col gap-1.5'>
                  <Text size='sm' className='opacity-50'>Public Key Hash:</Text>
                  <Text size='xs' className='break-all font-mono'>{key.publicKeyHash}</Text>
                </div>
              </div>
            </ValueCard>
          ))}
        </div>
      )}

      {data.publicKeyIdsToDisable != null && data.publicKeyIdsToDisable.length > 0 && (
        <ValueCard colorScheme='lightGray' size='lg' border={false}>
          <div className='flex flex-col gap-1.5'>
            <Text size='sm' weight='medium' className='opacity-50'>Public Key IDs to Disable:</Text>
            <Text size='sm'>{data.publicKeyIdsToDisable.join(', ')}</Text>
          </div>
        </ValueCard>
      )}
    </div>
  )
}


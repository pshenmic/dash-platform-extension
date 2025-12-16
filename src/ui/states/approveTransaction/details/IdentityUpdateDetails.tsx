import React from 'react'
import { Text, ValueCard, Identifier } from 'dash-ui-kit/react'
import { TransactionFieldRow, TransactionDetailsCard } from '../../../components/transactions'
import { useTransactionSigned } from './index'

interface IdentityUpdateDetailsProps {
  data: any
}

export function IdentityUpdateDetails ({ data }: IdentityUpdateDetailsProps): React.JSX.Element {
  const signed = useTransactionSigned()

  return (
    <div className='flex flex-col gap-2.5'>
      <TransactionDetailsCard title='Identity ID'>
        <Identifier>{data.identityId}</Identifier>
      </TransactionDetailsCard>

      <TransactionDetailsCard title='Update Details'>
        <TransactionFieldRow label='Revision:' value={data.revision} />
        <TransactionFieldRow label='Identity Nonce:' value={data.identityNonce} />
        <TransactionFieldRow label='User Fee Increase:' value={data.userFeeIncrease} />
        {signed && data.signaturePublicKeyId != null && (
          <TransactionFieldRow label='Signature Public Key ID:' value={data.signaturePublicKeyId} />
        )}
      </TransactionDetailsCard>

      {data.publicKeysToAdd != null && data.publicKeysToAdd.length > 0 && (
        <TransactionDetailsCard title={`Public Keys to Add (${String(data.publicKeysToAdd.length)})`}>
          <div className='flex flex-col gap-2.5'>
            {data.publicKeysToAdd.map((key: any, index: number) => (
              <ValueCard key={index} colorScheme='lightGray' size='lg' border={false}>
                <div className='flex flex-col gap-2.5'>
                  <Text size='sm' weight='medium'>Key {index + 1}</Text>
                  <TransactionFieldRow label='ID:' value={key.id} />
                  <TransactionFieldRow label='Type:' value={key.type} />
                  <TransactionFieldRow label='Purpose:' value={key.purpose} />
                  <TransactionFieldRow label='Security Level:' value={key.securityLevel} />
                  <TransactionFieldRow label='Read Only:' value={(key.readOnly === true) ? 'Yes' : 'No'} />
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
        </TransactionDetailsCard>
      )}

      {data.publicKeyIdsToDisable != null && data.publicKeyIdsToDisable.length > 0 && (
        <TransactionDetailsCard title='Public Key IDs to Disable'>
          <Text size='sm'>{data.publicKeyIdsToDisable.join(', ')}</Text>
        </TransactionDetailsCard>
      )}
    </div>
  )
}

import React from 'react'
import { Text, ValueCard, Identifier } from 'dash-ui-kit/react'
import type { DecodedIdentityUpdateTransition } from '../../../../types/DecodedStateTransition'
import { TransactionDetailsCard } from '../../../components/transactions'
import { useTransactionSigned } from './index'

interface IdentityUpdateDetailsProps {
  data: DecodedIdentityUpdateTransition
}

export function IdentityUpdateDetails ({ data }: IdentityUpdateDetailsProps): React.JSX.Element {
  const signed = useTransactionSigned()

  return (
    <div className='flex flex-col gap-2.5'>
      <TransactionDetailsCard title='Identity'>
        <Identifier className='!text-[1.25rem]' avatar copyButton middleEllipsis edgeChars={5}>
          {data.identityId}
        </Identifier>
      </TransactionDetailsCard>

      <div className='flex gap-2.5'>
        <TransactionDetailsCard className='flex-1' title='Revision'>
          <Text size='lg'>
            {data.revision}
          </Text>
        </TransactionDetailsCard>
        <TransactionDetailsCard className='flex-1' title='Identity Nonce'>
          <Text size='lg'>
            {data.identityNonce}
          </Text>
        </TransactionDetailsCard>
      </div>

      <div className='flex gap-2.5'>
        <TransactionDetailsCard className='flex-1' title='User Fee Increase'>
          <Text size='lg'>
            {data.userFeeIncrease}
          </Text>
        </TransactionDetailsCard>
        {signed && data.signaturePublicKeyId != null && (
          <TransactionDetailsCard className='flex-1' title='Public Key ID'>
            <Text size='lg'>
              {data.signaturePublicKeyId}
            </Text>
          </TransactionDetailsCard>
        )}
      </div>

      {data.publicKeysToAdd != null && data.publicKeysToAdd.length > 0 && (
        <TransactionDetailsCard title={`Public Keys to Add (${String(data.publicKeysToAdd.length)})`}>
          <div className='flex flex-col gap-2.5'>
            {data.publicKeysToAdd.map((key: any, index: number) => (
              <ValueCard key={index} colorScheme='lightGray' size='lg' border={false}>
                <div className='flex flex-col gap-2.5'>
                  <Text size='sm' weight='medium'>Key {index + 1}</Text>
                  <div className='flex justify-between'>
                    <Text size='sm' className='opacity-50'>ID:</Text>
                    <Text size='sm'>{key.id}</Text>
                  </div>
                  <div className='flex justify-between'>
                    <Text size='sm' className='opacity-50'>Type:</Text>
                    <Text size='sm'>{key.type}</Text>
                  </div>
                  <div className='flex justify-between'>
                    <Text size='sm' className='opacity-50'>Purpose:</Text>
                    <Text size='sm'>{key.purpose}</Text>
                  </div>
                  <div className='flex justify-between'>
                    <Text size='sm' className='opacity-50'>Security Level:</Text>
                    <Text size='sm'>{key.securityLevel}</Text>
                  </div>
                  <div className='flex justify-between'>
                    <Text size='sm' className='opacity-50'>Read Only:</Text>
                    <Text size='sm'>{(key.readOnly === true) ? 'Yes' : 'No'}</Text>
                  </div>
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

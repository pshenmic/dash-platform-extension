import React from 'react'
import { Text, ValueCard, Identifier } from 'dash-ui-kit/react'
import { TransactionFieldRow, TransactionDetailsCard } from '../../../components/transactions'

interface BatchTransitionDetailsProps {
  data: any
}

export function BatchTransitionDetails ({ data }: BatchTransitionDetailsProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-2.5'>
      <TransactionDetailsCard title='Owner ID'>
        <Identifier>{data.ownerId}</Identifier>
      </TransactionDetailsCard>

      <TransactionDetailsCard title='Transaction Details'>
        <TransactionFieldRow label='User Fee Increase:' value={data.userFeeIncrease} />
        <TransactionFieldRow label='Signature Public Key ID:' value={data.signaturePublicKeyId} />
      </TransactionDetailsCard>

      {data.transitions != null && data.transitions.length > 0 && (
        <TransactionDetailsCard title={`Transitions (${String(data.transitions.length)})`}>
          <div className='flex flex-col gap-2.5'>
            {data.transitions.map((transition: any, index: number) => (
              <ValueCard key={index} colorScheme='lightGray' size='lg' border={false}>
                <div className='flex flex-col gap-2.5'>
                  <Text size='sm' weight='medium'>Transition {index + 1}</Text>
                  <TransactionFieldRow label='Action:' value={transition.action} />

                  {transition.id != null && (
                    <div className='flex flex-col gap-1.5'>
                      <Text size='sm' className='opacity-50'>ID:</Text>
                      <Text size='xs' className='break-all font-mono'>{transition.id}</Text>
                    </div>
                  )}

                  {transition.dataContractId != null && (
                    <div className='flex flex-col gap-1.5'>
                      <Text size='sm' className='opacity-50'>Data Contract ID:</Text>
                      <Text size='xs' className='break-all font-mono'>{transition.dataContractId}</Text>
                    </div>
                  )}

                  {transition.type != null && <TransactionFieldRow label='Type:' value={transition.type} />}
                  {transition.revision != null && <TransactionFieldRow label='Revision:' value={transition.revision} />}
                  {transition.identityContractNonce != null && <TransactionFieldRow label='Identity Contract Nonce:' value={transition.identityContractNonce} />}
                  {transition.tokenId != null && <TransactionFieldRow label='Token ID:' value={transition.tokenId} />}
                  {transition.amount != null && <TransactionFieldRow label='Amount:' value={transition.amount} />}

                  {transition.recipient != null && (
                    <div className='flex flex-col gap-1.5'>
                      <Text size='sm' className='opacity-50'>Recipient:</Text>
                      <Text size='xs' className='break-all font-mono'>{transition.recipient}</Text>
                    </div>
                  )}

                  {transition.data != null && (
                    <div className='flex flex-col gap-1.5'>
                      <Text size='sm' className='opacity-50'>Data:</Text>
                      <pre className='text-xs overflow-auto break-all whitespace-pre-wrap'>
                        {JSON.stringify(transition.data, null, 2)}
                      </pre>
                    </div>
                  )}

                  {transition.tokenPaymentInfo != null && (
                    <div className='flex flex-col gap-1.5'>
                      <Text size='sm' className='opacity-50'>Token Payment Info:</Text>
                      <pre className='text-xs overflow-auto break-all whitespace-pre-wrap'>
                        {JSON.stringify(transition.tokenPaymentInfo, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </ValueCard>
            ))}
          </div>
        </TransactionDetailsCard>
      )}
    </div>
  )
}

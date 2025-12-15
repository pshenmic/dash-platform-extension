import React from 'react'
import { Text, Identifier } from 'dash-ui-kit/react'
import { TransactionDetailsCard } from '../../../components/transactions'
import { BatchActions, type BatchActionCode } from '../../../../enums/BatchActions'

interface BatchTransitionDetailsProps {
  data: any
}

export function BatchTransitionDetails ({ data }: BatchTransitionDetailsProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-2.5'>
      <TransactionDetailsCard title='Owner ID'>
        <Identifier>{data.ownerId}</Identifier>
      </TransactionDetailsCard>

      <div className='flex gap-2.5'>
        <TransactionDetailsCard className='flex-1' title='User Fee Increase'>
          <Text size='lg'>
            {data.userFeeIncrease}
          </Text>
        </TransactionDetailsCard>
        <TransactionDetailsCard className='flex-1' title='Public Key ID'>
          <Text size='lg'>
            {data.signaturePublicKeyId}
          </Text>
        </TransactionDetailsCard>
      </div>

      {data.transitions != null && data.transitions.length > 0 && (
        <>
          {data.transitions.map((transition: any, index: number) => (
            <div key={index} className='flex flex-col gap-2.5'>
              <Text size='md' weight='medium' className='mt-2.5'>
                Transition {index + 1}
              </Text>
              
              {transition.action != null && (
                <TransactionDetailsCard title='Action'>
                  <Text size='lg' weight='medium'>
                    {BatchActions[transition.action as BatchActionCode]?.title ?? transition.action}
                  </Text>
                </TransactionDetailsCard>
              )}
              
              {transition.id != null && (
                <TransactionDetailsCard title='ID'>
                  <Identifier>{transition.id}</Identifier>
                </TransactionDetailsCard>
              )}
              
              {transition.dataContractId != null && (
                <TransactionDetailsCard title='Data Contract ID'>
                  <Identifier>{transition.dataContractId}</Identifier>
                </TransactionDetailsCard>
              )}
              
              {transition.type != null && (
                <TransactionDetailsCard title='Type'>
                  <Text size='lg'>{transition.type}</Text>
                </TransactionDetailsCard>
              )}
              
              {transition.revision != null && (
                <TransactionDetailsCard title='Revision'>
                  <Text size='lg'>{transition.revision}</Text>
                </TransactionDetailsCard>
              )}
              
              {transition.identityContractNonce != null && (
                <TransactionDetailsCard title='Identity Contract Nonce'>
                  <Text size='lg'>{transition.identityContractNonce}</Text>
                </TransactionDetailsCard>
              )}
              
              {transition.tokenId != null && (
                <TransactionDetailsCard title='Token ID'>
                  <Identifier>{transition.tokenId}</Identifier>
                </TransactionDetailsCard>
              )}
              
              {transition.amount != null && (
                <TransactionDetailsCard title='Amount'>
                  <Text size='lg' weight='medium'>{transition.amount}</Text>
                </TransactionDetailsCard>
              )}
              
              {transition.recipient != null && (
                <TransactionDetailsCard title='Recipient'>
                  <Identifier>{transition.recipient}</Identifier>
                </TransactionDetailsCard>
              )}
              
              {transition.data != null && (
                <TransactionDetailsCard title='Data'>
                  <pre className='text-xs overflow-auto break-all whitespace-pre-wrap'>
                    {JSON.stringify(transition.data, null, 2)}
                  </pre>
                </TransactionDetailsCard>
              )}

              {transition.tokenPaymentInfo != null && (
                <TransactionDetailsCard title='Token Payment Info'>
                  <pre className='text-xs overflow-auto break-all whitespace-pre-wrap'>
                    {JSON.stringify(transition.tokenPaymentInfo, null, 2)}
                  </pre>
                </TransactionDetailsCard>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

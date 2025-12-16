import React from 'react'
import { Text, Identifier } from 'dash-ui-kit/react'
import { TransactionDetailsCard } from '../../../../components/transactions'
import { BatchActions, type BatchActionCode } from '../../../../../enums/BatchActions'

interface DocumentCreateDetailsProps {
  transition: any
}

export function DocumentCreateDetails ({ transition }: DocumentCreateDetailsProps): React.JSX.Element {
  return (
    <>
      {/* Data Contract Identifier */}
      {transition.dataContractId != null && (
        <TransactionDetailsCard title='Data Contract Identifier'>
          <Identifier className='!text-[1.25rem]' avatar copyButton middleEllipsis edgeChars={5}>
            {transition.dataContractId}
          </Identifier>
        </TransactionDetailsCard>
      )}

      {/* Document Type + Action */}
      {(transition.type != null || transition.action != null) && (
        <div className='flex gap-2.5'>
          {transition.type != null && (
            <TransactionDetailsCard title='Document Type' className='flex-1'>
              <Text size='sm' weight='medium'>{transition.type}</Text>
            </TransactionDetailsCard>
          )}
          {transition.action != null && (
            <TransactionDetailsCard title='Action' className='flex-1'>
              <Text size='sm' weight='medium'>
                {BatchActions[transition.action as BatchActionCode]?.title ?? transition.action}
              </Text>
            </TransactionDetailsCard>
          )}
        </div>
      )}

      {/* Document Identifier */}
      {transition.id != null && (
        <TransactionDetailsCard title='Document Identifier'>
          <Identifier className='!text-[1.25rem]' avatar copyButton middleEllipsis edgeChars={5}>
            {transition.id}
          </Identifier>
        </TransactionDetailsCard>
      )}

      {/* Revision + Identity Contract Nonce */}
      {(transition.revision != null || transition.identityContractNonce != null) && (
        <div className='flex gap-2.5'>
          {transition.revision != null && (
            <TransactionDetailsCard title='Revision'>
              <Text size='sm' weight='medium'>{transition.revision}</Text>
            </TransactionDetailsCard>
          )}
          {transition.identityContractNonce != null && (
            <TransactionDetailsCard title='Identity Contract Nonce' className='flex-1'>
              <Text size='sm' weight='medium'>{transition.identityContractNonce}</Text>
            </TransactionDetailsCard>
          )}
        </div>
      )}

      {/* Data */}
      {transition.data != null && (
        <TransactionDetailsCard title='Data'>
          <div className='relative max-h-[200px] overflow-auto'>
            <pre className='text-dash-primary-dark-blue font-dash-grotesque text-sm font-medium opacity-75 whitespace-pre-wrap break-all'>
              {JSON.stringify(transition.data, null, 2)}
            </pre>
          </div>
        </TransactionDetailsCard>
      )}
    </>
  )
}

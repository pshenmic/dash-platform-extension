import React from 'react'
import { Text, Identifier } from 'dash-ui-kit/react'
import { TransactionDetailsCard } from '../../../components/transactions'
import { BatchActions, type BatchActionCode } from '../../../../enums/BatchActions'
import { TokenTransferDetails, DocumentCreateDetails } from './batch'

interface BatchTransitionDetailsProps {
  data: any
}

function renderTransitionDetails (transition: any): React.JSX.Element | null {
  switch (transition.action) {
    case 'TOKEN_TRANSFER':
      return <TokenTransferDetails transition={transition} />
    case 'DOCUMENT_CREATE':
      return <DocumentCreateDetails transition={transition} />
    default:
      return null
  }
}

export function BatchTransitionDetails ({ data }: BatchTransitionDetailsProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-2.5'>
      <TransactionDetailsCard title='Owner ID'>
        <Identifier className='!text-[1.25rem]' avatar copyButton middleEllipsis edgeChars={5}>
          {data.ownerId}
        </Identifier>
      </TransactionDetailsCard>

      <TransactionDetailsCard className='flex-1' title='Public Key ID'>
        <Text size='lg'>
          {data.signaturePublicKeyId}
        </Text>
      </TransactionDetailsCard>

      {data.transitions != null && data.transitions.length > 0 && (
        data.transitions.map((transition: any, index: number) => (
          <div key={index} className='flex flex-col gap-2.5'>
            {transition.action != null && (
              <TransactionDetailsCard title='Action'>
                <Text size='lg' weight='medium'>
                  {BatchActions[transition.action as BatchActionCode]?.title ?? transition.action}
                </Text>
              </TransactionDetailsCard>
            )}

            {renderTransitionDetails(transition)}
          </div>
        ))
      )}
    </div>
  )
}

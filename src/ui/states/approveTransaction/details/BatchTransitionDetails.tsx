import React from 'react'
import { Text, Identifier } from 'dash-ui-kit/react'
import { TransactionDetailsCard } from '../../../components/transactions'
import { TokenTransferDetails, DocumentCreateDetails } from './batch'
import { useTransactionSigned } from './index'

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
  const signed = useTransactionSigned()

  return (
    <div className='flex flex-col gap-2.5'>
      <TransactionDetailsCard title='Owner ID'>
        <Identifier className='!text-[1.25rem]' avatar copyButton middleEllipsis edgeChars={5}>
          {data.ownerId}
        </Identifier>
      </TransactionDetailsCard>

      {signed && data.signaturePublicKeyId != null && (
        <TransactionDetailsCard className='flex-1' title='Public Key ID'>
          <Text>
            {data.signaturePublicKeyId}
          </Text>
        </TransactionDetailsCard>
      )}

      {data.transitions != null && data.transitions.length > 0 && (
        data.transitions.map((transition: any, index: number) => (
          <div key={index} className='flex flex-col gap-2.5'>
            {renderTransitionDetails(transition)}
          </div>
        ))
      )}
    </div>
  )
}

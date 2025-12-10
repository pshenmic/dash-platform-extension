import React from 'react'
import { ValueCard } from 'dash-ui-kit/react'
import { TransactionField, TransactionFieldRow } from '../../../components/transactions'

interface IdentityCreditTransferDetailsProps {
  data: any
}

export function IdentityCreditTransferDetails ({ data }: IdentityCreditTransferDetailsProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-2.5'>
      <TransactionField
        label='Sender ID:'
        value={data.senderId}
        valueType='identifier'
      />

      <TransactionField
        label='Recipient ID:'
        value={data.recipientId}
        valueType='identifier'
      />

      <ValueCard colorScheme='lightGray' size='lg' border={false}>
        <div className='flex flex-col gap-2.5'>
          <TransactionFieldRow label='Amount:' value={data.amount} />
          <TransactionFieldRow label='Identity Nonce:' value={data.identityNonce} />
          <TransactionFieldRow label='User Fee Increase:' value={data.userFeeIncrease} />
          <TransactionFieldRow label='Signature Public Key ID:' value={data.signaturePublicKeyId} />
        </div>
      </ValueCard>
    </div>
  )
}


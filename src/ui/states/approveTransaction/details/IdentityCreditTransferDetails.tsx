import React from 'react'
import { Identifier } from 'dash-ui-kit/react'
import { TransactionFieldRow, TransactionDetailsCard } from '../../../components/transactions'

interface IdentityCreditTransferDetailsProps {
  data: any
}

export function IdentityCreditTransferDetails ({ data }: IdentityCreditTransferDetailsProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-2.5'>
      <TransactionDetailsCard title='Sender ID'>
        <Identifier>{data.senderId}</Identifier>
      </TransactionDetailsCard>

      <TransactionDetailsCard title='Recipient ID'>
        <Identifier>{data.recipientId}</Identifier>
      </TransactionDetailsCard>

      <TransactionDetailsCard title='Transfer Details'>
        <TransactionFieldRow label='Amount:' value={data.amount} />
        <TransactionFieldRow label='Identity Nonce:' value={data.identityNonce} />
        <TransactionFieldRow label='User Fee Increase:' value={data.userFeeIncrease} />
        <TransactionFieldRow label='Signature Public Key ID:' value={data.signaturePublicKeyId} />
      </TransactionDetailsCard>
    </div>
  )
}

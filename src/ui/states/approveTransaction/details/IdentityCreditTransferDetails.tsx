import React from 'react'
import type { DecodedIdentityCreditTransferTransition } from '../../../../types/DecodedStateTransition'
import { TransactionAmountCard } from './TransactionAmountCard'
import { DetailRow } from './DetailRow'
import { MoreDetails } from './MoreDetails'
import { IdentityValue } from './IdentityValue'
import { useTransactionSigned } from './index'

interface IdentityCreditTransferDetailsProps {
  data: DecodedIdentityCreditTransferTransition
}

export function IdentityCreditTransferDetails ({ data }: IdentityCreditTransferDetailsProps): React.JSX.Element {
  const signed = useTransactionSigned()

  return (
    <TransactionAmountCard label='Transfer Amount' credits={data.amount}>
      <DetailRow label='From:' value={<IdentityValue identifier={data.senderId} />} />
      <DetailRow label='To:' value={<IdentityValue identifier={data.recipientId} />} />
      <MoreDetails>
        <DetailRow label='Identity Nonce:' value={data.identityNonce} />
        {signed && data.signaturePublicKeyId != null && (
          <DetailRow label='Signing Key:' value={`Key ID ${data.signaturePublicKeyId}`} />
        )}
      </MoreDetails>
    </TransactionAmountCard>
  )
}

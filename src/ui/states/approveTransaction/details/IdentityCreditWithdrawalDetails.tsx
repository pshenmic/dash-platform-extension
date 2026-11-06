import React from 'react'
import { Identifier, Text } from 'dash-ui-kit/react'
import type { DecodedIdentityCreditWithdrawalTransition } from '../../../../types/DecodedStateTransition'
import { TransactionAmountCard } from './TransactionAmountCard'
import { DetailRow } from './DetailRow'
import { MoreDetails } from './MoreDetails'
import { useTransactionSigned } from './index'

interface IdentityCreditWithdrawalDetailsProps {
  data: DecodedIdentityCreditWithdrawalTransition
}

export function IdentityCreditWithdrawalDetails ({ data }: IdentityCreditWithdrawalDetailsProps): React.JSX.Element {
  const signed = useTransactionSigned()

  return (
    <TransactionAmountCard label='Withdrawal Amount' credits={data.amount}>
      <DetailRow
        label='Identity:'
        value={<Identifier size='xs' avatar highlight='both' middleEllipsis edgeChars={5} className='min-w-0'>{data.identityId}</Identifier>}
      />
      <MoreDetails>
        <DetailRow label='Identity Nonce:' value={data.identityNonce} />
        <DetailRow label='Pooling:' value={data.pooling} />
        {signed && data.signaturePublicKeyId != null && (
          <DetailRow label='Signing Key:' value={`Key ID ${data.signaturePublicKeyId}`} />
        )}
        {data.outputScript != null && (
          <div className='flex flex-col gap-1 py-2'>
            <Text size='xs' weight='medium' dim>Output Script:</Text>
            <Identifier size='xs' copyButton linesAdjustment={false} className='break-all'>
              {data.outputScript}
            </Identifier>
          </div>
        )}
      </MoreDetails>
    </TransactionAmountCard>
  )
}

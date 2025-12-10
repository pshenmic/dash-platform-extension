import React from 'react'
import { Text } from 'dash-ui-kit/react'

interface IdentityCreditTransferDetailsProps {
  data: any
}

export function IdentityCreditTransferDetails ({ data }: IdentityCreditTransferDetailsProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-2'>
      <Text size='md' weight='medium'>Identity Credit Transfer</Text>
      <div className='flex flex-col gap-1'>
        <Text size='sm'>Type: {data.typeString}</Text>
        <Text size='sm'>Sender ID: {data.senderId}</Text>
        <Text size='sm'>Recipient ID: {data.recipientId}</Text>
        <Text size='sm'>Amount: {data.amount}</Text>
        <Text size='sm'>Identity Nonce: {data.identityNonce}</Text>
        <Text size='sm'>User Fee Increase: {data.userFeeIncrease}</Text>
        <Text size='sm'>Signature Public Key ID: {data.signaturePublicKeyId}</Text>
      </div>
    </div>
  )
}


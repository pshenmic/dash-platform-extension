import React from 'react'
import { Text } from 'dash-ui-kit/react'

interface BatchTransitionDetailsProps {
  data: any
}

export function BatchTransitionDetails ({ data }: BatchTransitionDetailsProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-2'>
      <Text size='md' weight='medium'>Batch Transition</Text>
      <div className='flex flex-col gap-1'>
        <Text size='sm'>Type: {data.typeString}</Text>
        <Text size='sm'>Owner ID: {data.ownerId}</Text>
        <Text size='sm'>User Fee Increase: {data.userFeeIncrease}</Text>
        <Text size='sm'>Signature Public Key ID: {data.signaturePublicKeyId}</Text>
        
        {data.transitions != null && data.transitions.length > 0 && (
          <>
            <Text size='sm' weight='medium'>Transitions ({data.transitions.length}):</Text>
            {data.transitions.map((transition: any, index: number) => (
              <div key={index} className='flex flex-col gap-1 ml-4'>
                <Text size='sm' weight='medium'>Transition {index + 1}:</Text>
                <Text size='sm'>Action: {transition.action}</Text>
                {transition.id != null && <Text size='sm'>ID: {transition.id}</Text>}
                {transition.dataContractId != null && <Text size='sm'>Data Contract ID: {transition.dataContractId}</Text>}
                {transition.type != null && <Text size='sm'>Type: {transition.type}</Text>}
                {transition.revision != null && <Text size='sm'>Revision: {transition.revision}</Text>}
                {transition.identityContractNonce != null && <Text size='sm'>Identity Contract Nonce: {transition.identityContractNonce}</Text>}
                
                {transition.data != null && (
                  <>
                    <Text size='sm' weight='medium'>Data:</Text>
                    <pre className='text-xs overflow-auto'>
                      {JSON.stringify(transition.data, null, 2)}
                    </pre>
                  </>
                )}

                {transition.tokenId != null && <Text size='sm'>Token ID: {transition.tokenId}</Text>}
                {transition.amount != null && <Text size='sm'>Amount: {transition.amount}</Text>}
                {transition.recipient != null && <Text size='sm'>Recipient: {transition.recipient}</Text>}
                
                {transition.tokenPaymentInfo != null && (
                  <>
                    <Text size='sm' weight='medium'>Token Payment Info:</Text>
                    <pre className='text-xs overflow-auto'>
                      {JSON.stringify(transition.tokenPaymentInfo, null, 2)}
                    </pre>
                  </>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}


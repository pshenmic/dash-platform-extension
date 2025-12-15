import React from 'react'
import { Text, Identifier } from 'dash-ui-kit/react'
import { TransactionDetailsCard } from '../../../../components/transactions'

interface DocumentCreateDetailsProps {
  transition: any
}

export function DocumentCreateDetails ({ transition }: DocumentCreateDetailsProps): React.JSX.Element {
  return (
    <>
      {transition.id != null && (
        <TransactionDetailsCard title='Document ID'>
          <Identifier className='!text-[1.25rem]' avatar copyButton middleEllipsis edgeChars={5}>
            {transition.id}
          </Identifier>
        </TransactionDetailsCard>
      )}

      {transition.type != null && (
        <TransactionDetailsCard title='Document Type'>
          <Text size='lg' weight='medium'>{transition.type}</Text>
        </TransactionDetailsCard>
      )}

      {transition.dataContractId != null && (
        <TransactionDetailsCard title='Data Contract ID'>
          <Identifier className='!text-[1.25rem]' avatar copyButton middleEllipsis edgeChars={5}>
            {transition.dataContractId}
          </Identifier>
        </TransactionDetailsCard>
      )}

      {transition.data != null && (
        <TransactionDetailsCard title='Document Data'>
          <pre className='text-xs overflow-auto break-all whitespace-pre-wrap max-h-[200px]'>
            {JSON.stringify(transition.data, null, 2)}
          </pre>
        </TransactionDetailsCard>
      )}

      {transition.entropy != null && (
        <TransactionDetailsCard title='Entropy'>
          <Text size='sm' className='font-mono break-all'>{transition.entropy}</Text>
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

      {transition.prefundedVotingBalance != null && (
        <TransactionDetailsCard title='Prefunded Voting Balance'>
          <div className='flex flex-col gap-1.5'>
            {Object.entries(transition.prefundedVotingBalance).map(([key, value]) => (
              <div key={key} className='flex justify-between'>
                <Text size='sm' color='muted'>{key}:</Text>
                <Text size='sm' className='font-medium'>{String(value)}</Text>
              </div>
            ))}
          </div>
        </TransactionDetailsCard>
      )}

      {transition.tokenPaymentInfo != null && (
        <TransactionDetailsCard title='Token Payment Info'>
          <div className='flex flex-col gap-2'>
            {transition.tokenPaymentInfo.paymentTokenContractId != null && (
              <div className='flex flex-col gap-1'>
                <Text size='sm' color='muted'>Payment Token Contract:</Text>
                <Identifier className='!text-[0.875rem]' copyButton middleEllipsis edgeChars={4}>
                  {transition.tokenPaymentInfo.paymentTokenContractId}
                </Identifier>
              </div>
            )}
            {transition.tokenPaymentInfo.tokenContractPosition != null && (
              <div className='flex justify-between'>
                <Text size='sm' color='muted'>Token Position:</Text>
                <Text size='sm'>{transition.tokenPaymentInfo.tokenContractPosition}</Text>
              </div>
            )}
            {transition.tokenPaymentInfo.minimumTokenCost != null && (
              <div className='flex justify-between'>
                <Text size='sm' color='muted'>Min Cost:</Text>
                <Text size='sm' className='font-medium'>{transition.tokenPaymentInfo.minimumTokenCost}</Text>
              </div>
            )}
            {transition.tokenPaymentInfo.maximumTokenCost != null && (
              <div className='flex justify-between'>
                <Text size='sm' color='muted'>Max Cost:</Text>
                <Text size='sm' className='font-medium'>{transition.tokenPaymentInfo.maximumTokenCost}</Text>
              </div>
            )}
            {transition.tokenPaymentInfo.gasFeesPaidBy != null && (
              <div className='flex justify-between'>
                <Text size='sm' color='muted'>Gas Fees Paid By:</Text>
                <Text size='sm'>{transition.tokenPaymentInfo.gasFeesPaidBy}</Text>
              </div>
            )}
          </div>
        </TransactionDetailsCard>
      )}
    </>
  )
}


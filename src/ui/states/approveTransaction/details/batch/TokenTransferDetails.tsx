import React from 'react'
import { Text, Identifier, BigNumber } from 'dash-ui-kit/react'
import { TransactionDetailsCard } from '../../../../components/transactions'

interface TokenTransferDetailsProps {
  transition: any
}

export function TokenTransferDetails ({ transition }: TokenTransferDetailsProps): React.JSX.Element {
  return (
    <>
      {transition.amount != null && (
        <TransactionDetailsCard title='Amount'>
          <BigNumber className='font-medium'>{transition.amount}</BigNumber>
        </TransactionDetailsCard>
      )}

      {transition.recipient != null && (
        <TransactionDetailsCard title='Recipient'>
          <Identifier className='!text-[1.25rem]' avatar copyButton middleEllipsis edgeChars={5}>
            {transition.recipient}
          </Identifier>
        </TransactionDetailsCard>
      )}

      {transition.publicNote != null && (
        <TransactionDetailsCard title='Public Note'>
          <Text size='lg' className='break-all'>{transition.publicNote}</Text>
        </TransactionDetailsCard>
      )}

      {transition.tokenId != null && (
        <TransactionDetailsCard title='Token ID'>
          <Identifier className='!text-[1.25rem]' avatar copyButton middleEllipsis edgeChars={5}>
            {transition.tokenId}
          </Identifier>
        </TransactionDetailsCard>
      )}

      {transition.dataContractId != null && (
        <TransactionDetailsCard title='Data Contract ID'>
          <Identifier className='!text-[1.25rem]' avatar copyButton middleEllipsis edgeChars={5}>
            {transition.dataContractId}
          </Identifier>
        </TransactionDetailsCard>
      )}

      {transition.tokenContractPosition != null && (
        <TransactionDetailsCard title='Token Contract Position'>
          <Text size='lg'>{transition.tokenContractPosition}</Text>
        </TransactionDetailsCard>
      )}

      {transition.historicalDocumentTypeName != null && (
        <TransactionDetailsCard title='Historical Document Type'>
          <Text size='lg'>{transition.historicalDocumentTypeName}</Text>
        </TransactionDetailsCard>
      )}

      {transition.historicalDocumentId != null && (
        <TransactionDetailsCard title='Historical Document ID'>
          <Identifier className='!text-[1.25rem]' avatar copyButton middleEllipsis edgeChars={5}>
            {transition.historicalDocumentId}
          </Identifier>
        </TransactionDetailsCard>
      )}

      {transition.identityContractNonce != null && (
        <TransactionDetailsCard title='Identity Contract Nonce'>
          <Text size='lg'>{transition.identityContractNonce}</Text>
        </TransactionDetailsCard>
      )}

      {transition.groupInfo != null && (
        <TransactionDetailsCard title='Group Info'>
          <div className='flex flex-col gap-1.5'>
            <div className='flex justify-between'>
              <Text size='sm' color='muted'>Group Position:</Text>
              <Text size='sm'>{transition.groupInfo.groupContractPosition}</Text>
            </div>
            <div className='flex justify-between'>
              <Text size='sm' color='muted'>Action ID:</Text>
              <Identifier className='!text-[0.875rem]' copyButton edgeChars={4}>
                {transition.groupInfo.actionId}
              </Identifier>
            </div>
            <div className='flex justify-between'>
              <Text size='sm' color='muted'>Is Proposer:</Text>
              <Text size='sm'>{transition.groupInfo.actionIsProposer ? 'Yes' : 'No'}</Text>
            </div>
          </div>
        </TransactionDetailsCard>
      )}
    </>
  )
}


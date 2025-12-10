import React from 'react'
import { BatchTransitionDetails } from './BatchTransitionDetails'
import { IdentityCreateDetails } from './IdentityCreateDetails'
import { IdentityUpdateDetails } from './IdentityUpdateDetails'
import { IdentityCreditTransferDetails } from './IdentityCreditTransferDetails'
import { MasternodeVoteDetails } from './MasternodeVoteDetails'
import { TransactionHashBlock } from '../../../components/transactions'
import { Text } from 'dash-ui-kit/react'

interface TransactionDetailsProps {
  data: any
  transactionHash?: string
  network?: 'testnet' | 'mainnet'
}

export function TransactionDetails ({ data, transactionHash, network = 'testnet' }: TransactionDetailsProps): React.JSX.Element {
  if (data == null) {
    return <div />
  }

  switch (data.type) {
    case 1:
      return <BatchTransitionDetails data={data} />
    case 2:
      return <IdentityCreateDetails data={data} />
    case 5:
      return <IdentityUpdateDetails data={data} />
    case 7:
      return <IdentityCreditTransferDetails data={data} />
    case 8:
      return <MasternodeVoteDetails data={data} />
    default:
      return (
        <div className='flex flex-col gap-2'>
          <Text size='md' weight='medium'>Unsupported Transaction Type</Text>
          {transactionHash != null && (
            <TransactionHashBlock
              hash={transactionHash}
              network={network}
              variant='compact'
              showActions={false}
              label='Transaction Hash'
            />
          )}
        </div>
      )
  }
}


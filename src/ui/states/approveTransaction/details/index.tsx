import React from 'react'
import { Accordion, Text } from 'dash-ui-kit/react'
import { BatchTransitionDetails } from './BatchTransitionDetails'
import { IdentityCreateDetails } from './IdentityCreateDetails'
import { IdentityUpdateDetails } from './IdentityUpdateDetails'
import { IdentityCreditTransferDetails } from './IdentityCreditTransferDetails'
import { MasternodeVoteDetails } from './MasternodeVoteDetails'
import { IdentityTopUpDetails } from './IdentityTopUpDetails'
import { IdentityCreditWithdrawalDetails } from './IdentityCreditWithdrawalDetails'
import { DataContractCreateDetails } from './DataContractCreateDetails'
import { DataContractUpdateDetails } from './DataContractUpdateDetails'
import { TransactionInfoSection } from '../../../components/transactions'

interface TransactionDetailsProps {
  data: any
  transactionHash?: string
  network?: 'testnet' | 'mainnet'
}

export function TransactionDetails ({ data, transactionHash, network = 'testnet' }: TransactionDetailsProps): React.JSX.Element {
  if (data == null) {
    return <div />
  }

  const renderDetailsContent = (): React.JSX.Element => {
    switch (data.type) {
      case 1:
        return <BatchTransitionDetails data={data} />
      case 2:
        return <IdentityCreateDetails data={data} />
      case 3:
        return <IdentityTopUpDetails data={data} />
      case 4:
        return <IdentityCreditWithdrawalDetails data={data} />
      case 5:
        return <IdentityUpdateDetails data={data} />
      case 6:
        return <DataContractCreateDetails data={data} />
      case 7:
        return <IdentityCreditTransferDetails data={data} />
      case 8:
        return <MasternodeVoteDetails data={data} />
      case 9:
        return <DataContractUpdateDetails data={data} />
      default:
        return (
          <Text size='sm'>Unsupported Transaction Type (Type: {data.type})</Text>
        )
    }
  }

  return (
    <div className='flex flex-col gap-2.5'>
      <TransactionInfoSection
        transactionHash={transactionHash}
        network={network}
        transactionType={data.typeString}
      />

      <Accordion
        title='Details'
        showSeparator
      >
        {renderDetailsContent()}
      </Accordion>
    </div>
  )
}


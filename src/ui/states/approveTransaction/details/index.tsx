import React, { createContext, useContext } from 'react'
import { Accordion, Text } from 'dash-ui-kit/react'
import { BatchTransitionDetails } from './BatchTransitionDetails'
import { IdentityUpdateDetails } from './IdentityUpdateDetails'
import { IdentityCreditTransferDetails } from './IdentityCreditTransferDetails'
import { MasternodeVoteDetails } from './MasternodeVoteDetails'
import { TransactionInfoSection } from '../../../components/transactions'

// Context for transaction signed state
const TransactionSignedContext = createContext<boolean>(false)

export const useTransactionSigned = (): boolean => useContext(TransactionSignedContext)

interface TransactionDetailsProps {
  data: any
  transactionHash?: string
  network?: 'testnet' | 'mainnet'
  signed?: boolean
}

export function TransactionDetails ({
  data,
  transactionHash,
  network = 'testnet',
  signed = false
}: TransactionDetailsProps): React.JSX.Element {
  if (data == null) {
    return <div />
  }

  const renderDetailsContent = (): React.JSX.Element => {
    switch (data.type) {
      case 1:
        return <BatchTransitionDetails data={data} />
      case 5:
        return <IdentityUpdateDetails data={data} />
      case 7:
        return <IdentityCreditTransferDetails data={data} />
      case 8:
        return <MasternodeVoteDetails data={data} />
      default:
        return (
          <Text size='sm'>Unsupported Transaction Type (Type: {data.type})</Text>
        )
    }
  }

  return (
    <TransactionSignedContext.Provider value={signed}>
      <div className='flex flex-col gap-2.5'>
        <TransactionInfoSection
          transactionHash={transactionHash}
          network={network}
          transactionType={data.typeString}
        />

        <Accordion
          title='Details'
          showSeparator={false}
        >
          {renderDetailsContent()}
        </Accordion>
      </div>
    </TransactionSignedContext.Provider>
  )
}

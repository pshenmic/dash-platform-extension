import React, { createContext, useContext } from 'react'
import { Accordion } from 'dash-ui-kit/react'
import type { NetworkType } from '../../../../types/NetworkType'
import type { DecodedStateTransition } from '../../../../types/DecodedStateTransition'
import { StateTransitionTypeEnum } from '../../../../enums'
import { BatchTransitionDetails } from './BatchTransitionDetails'
import { IdentityUpdateDetails } from './IdentityUpdateDetails'
import { IdentityCreditTransferDetails } from './IdentityCreditTransferDetails'
import { MasternodeVoteDetails } from './MasternodeVoteDetails'
import { TransactionInfoSection } from '../../../components/transactions'
import TransactionHashBlock from '../../../components/transactions/TransactionHashBlock'

// Context for transaction signed state
const TransactionSignedContext = createContext<boolean>(false)

export const useTransactionSigned = (): boolean => useContext(TransactionSignedContext)

interface TransactionDetailsProps {
  data: DecodedStateTransition
  transactionHash?: string
  network?: NetworkType
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

  const renderDetailsContent = (): React.JSX.Element | null => {
    switch (data.type) {
      case 1:
        return <BatchTransitionDetails data={data} />
      case 5:
        return <IdentityUpdateDetails data={data} />
      case 7:
        return <IdentityCreditTransferDetails data={data} />
      case 8:
        return <MasternodeVoteDetails data={data} />
      default: {
        return transactionHash != null
          ? (
            <TransactionHashBlock
              hash={transactionHash}
              network={network}
              variant='full'
            />
            )
          : null
      }
    }
  }

  return (
    <TransactionSignedContext.Provider value={signed}>
      <div className='flex flex-col gap-2.5'>
        <TransactionInfoSection
          transactionHash={transactionHash}
          network={network}
          transactionType={StateTransitionTypeEnum[data.type]}
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

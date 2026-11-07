import React, { createContext, useContext } from 'react'
import type { DecodedStateTransition } from '../../../../types/DecodedStateTransition'
import { BatchTransitionDetails } from './BatchTransitionDetails'
import { IdentityUpdateDetails } from './IdentityUpdateDetails'
import { IdentityCreditTransferDetails } from './IdentityCreditTransferDetails'
import { IdentityCreditWithdrawalDetails } from './IdentityCreditWithdrawalDetails'
import { MasternodeVoteDetails } from './MasternodeVoteDetails'

// Context for transaction signed state
const TransactionSignedContext = createContext<boolean>(false)

export const useTransactionSigned = (): boolean => useContext(TransactionSignedContext)

interface TransactionDetailsProps {
  data: DecodedStateTransition
  signed?: boolean
}

// Type-specific details of a decoded state transition.
export function TransactionDetails ({
  data,
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
      case 6:
        return <IdentityCreditWithdrawalDetails data={data} />
      case 7:
        return <IdentityCreditTransferDetails data={data} />
      case 8:
        return <MasternodeVoteDetails data={data} />
      default:
        return null
    }
  }

  return (
    <TransactionSignedContext.Provider value={signed}>
      {renderDetailsContent()}
    </TransactionSignedContext.Provider>
  )
}

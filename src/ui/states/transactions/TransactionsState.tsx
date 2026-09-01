import React from 'react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { SectionStub } from '../stubs/SectionStub'

function TransactionsState (): React.JSX.Element {
  return (
    <SectionStub
      title='Transactions'
      description='No wallet-wide tx list yet. Identity txs live on home-old; Platform overview shows mock operations.'
    />
  )
}

export default withAccessControl(TransactionsState, { requireWallet: false })

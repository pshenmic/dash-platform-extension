import React from 'react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { SectionStub } from '../stubs/SectionStub'

function ReceiveState (): React.JSX.Element {
  return (
    <SectionStub
      title='Receive'
      description='No dedicated receive route yet. Core receive waits on UTXO APIs; Platform receive is not split from send.'
    />
  )
}

export default withAccessControl(ReceiveState, { requireWallet: false })

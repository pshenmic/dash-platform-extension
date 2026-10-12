import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from 'dash-ui-kit/react'
import { EmptyState } from '../../components/layout/EmptyState'

/**
 * Dashboard placeholder for a keystore wallet with nothing in it. A keystore
 * wallet has no Core or address layer, so without an identity every card on the
 * dashboard is a zero. Importing is also its only way in - registering a new
 * identity needs a seedphrase.
 */
export function NoIdentities (): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <div className='screen-content'>
      <EmptyState
        title={<>You <Text weight='bold' color='blue' className='!text-[size:inherit] !leading-[inherit]'>Don't Have any Identities</Text> imported yet</>}
        description='A private key wallet holds imported identities only. Import one to see its balance, transactions, tokens and names.'
        buttonText='Import Identity'
        onButtonClick={() => { void navigate('/select-import-type') }}
      />
    </div>
  )
}

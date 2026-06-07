import React from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../../components/layout/EmptyState'
import { Text } from 'dash-ui-kit/react'

export default function NoWallets (): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <div className='screen-content'>
      <EmptyState
        title={<>You <Text weight='bold' color='blue' className='!text-[size:inherit] !leading-[inherit]'>Don't Have any wallets</Text> in this network</>}
        buttonText='Add a wallet'
        onButtonClick={() => { void navigate('/add-wallet') }}
      />
    </div>
  )
}

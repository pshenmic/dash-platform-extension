import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'dash-ui/react'
// import './home.state.css'

export default function NoWallets (): React.JSX.Element {
  const navigate = useNavigate()

  const handleCreateClick = (): void => {
    void navigate('/choose-wallet-type')
  }

  return (
    <div className='screen-content'>
      <div className='HomeState__NoIdentities__Container'>
        <h1 className='h1-title'>
          <b>You have<br />no wallets in this network</b>
        </h1>

        <div className='HomeState__NoIdentities__Buttons'>
          <Button onClick={handleCreateClick}>
            Create Wallet
          </Button>
        </div>
      </div>
    </div>
  )
}

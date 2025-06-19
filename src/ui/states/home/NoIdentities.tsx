import React from 'react'
import './home.state.css'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/controls/buttons'

export default function NoIdentities (): React.JSX.Element {
  const navigate = useNavigate()

  const handleImportClick = (): void => {
    void navigate('/import')
  }

  return (
    <div className='screen-content'>
      <div className='HomeState__NoIdentities__Container'>
        <h1 className='h1-title'>
          <b>You have<br />no identities yet</b>
        </h1>

        <div className='HomeState__NoIdentities__Buttons'>
          <Button onClick={handleImportClick}>
            Import
          </Button>

          <Button colorScheme='mint' disabled>
            Register
          </Button>
        </div>
      </div>
    </div>
  )
}

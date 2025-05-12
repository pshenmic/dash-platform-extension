import React from 'react'
import './home.state.css'
import { useNavigate } from 'react-router-dom'
import { Button } from "../../components/controls/buttons";

export default function () {
  const navigate = useNavigate();

  return (
    <div className={'HomeState__NoIdentities'}>
      <div className={'HomeState__NoIdentities__Container'}>
        <div className={'HomeState__NoIdentities__Title'}><b>You have<br/>no identities yet</b></div>

        <div className={'HomeState__NoIdentities__Buttons'}>
          <button className={'HomeState__NoIdentities__Buttons__Import'} onClick={() => navigate('import')}>Import
          </button>
          <button className={'HomeState__NoIdentities__Buttons__Register'} disabled={true}>Register</button>

          <Button onClick={() => console.log('click')}>
            test
          </Button>
        </div>
      </div>

    </div>
  )
}

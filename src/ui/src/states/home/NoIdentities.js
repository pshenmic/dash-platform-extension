import React, { useEffect, useState } from 'react'
import './home.state.css'
import { useNavigate } from 'react-router'

export default function () {
  const navigate = useNavigate();

  return (
    <div className={'HomeState__NoIdentities'}>
      <span className={'HomeState__NoIdentities__Title'}>You have no identities yet</span>

      <div className={'HomeState__NoIdentities__Buttons'}>
        <button className={'HomeState__NoIdentities__Buttons__Import'} onClick={() => navigate('import')}>Import</button>
        <button className={'HomeState__NoIdentities__Buttons__Register'} disabled={true}>Register</button>
      </div>
    </div>
  )
}

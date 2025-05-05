import React, { useEffect, useState } from 'react'
import './home.state.css'
import { useNavigate } from 'react-router'
import { useImage } from '../../hooks/useImage'
import Test from './Test.tsx'

export default function () {
  const navigate = useNavigate();

  const imagePath = useImage('assets/dash_cointest3.png')

  return (
    <div className={'HomeState__NoIdentities'}>
      <Test/>
      <div className={'HomeState__NoIdentities__Images'}>
        <svg width="37" height="30" viewBox="0 0 37 30" fill="none" xmlns="http://www.w3.org/2000/svg" className={'HomeState__NoIdentities__Images__DashLogo'}>
          <path
            d="M23.904 -3.8147e-06H10.6128L9.51224 6.15425L21.5063 6.17109C27.4135 6.17109 29.1598 8.3161 29.1093 11.8705C29.0812 13.6955 28.2951 16.7782 27.9525 17.7777C27.0429 20.4393 25.173 23.4827 18.1653 23.4715L6.50811 23.4659L5.40192 29.6258H18.6594C23.3368 29.6258 25.3246 29.0811 27.4303 28.1097C32.1022 25.9534 34.8817 21.3433 35.9935 15.3295C37.65 6.37324 35.5836 -3.8147e-06 23.904 -3.8147e-06Z"
            fill="#4C7EFF"/>
          <path
            d="M4.87985 11.7242C1.39843 11.7242 0.898675 13.9927 0.572994 15.3628C0.140624 17.1597 0.000244141 17.8841 0.000244141 17.8841H13.6059C17.0873 17.8841 17.587 15.6155 17.9127 14.2454C18.3451 12.4486 18.4855 11.7242 18.4855 11.7242H4.87985Z"
            fill="#4C7EFF"/>
        </svg>
        <img src={imagePath} alt={'Test'} className={'HomeState__NoIdentities__Images__CoinImage'}/>
      </div>

      <div className={'HomeState__NoIdentities__Container'}>
        <div className={'HomeState__NoIdentities__Title'}><b>You have no identities yet</b></div>

        <div className={'HomeState__NoIdentities__Buttons'}>
          <button className={'HomeState__NoIdentities__Buttons__Import'} onClick={() => navigate('import')}>Import
          </button>
          <button className={'HomeState__NoIdentities__Buttons__Register'} disabled={true}>Register</button>
        </div>
      </div>

    </div>
  )
}

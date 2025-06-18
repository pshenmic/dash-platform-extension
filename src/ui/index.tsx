import React, {useEffect, useState} from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider, RouteObject } from 'react-router-dom'
import HomeState from './states/home/HomeState'
import ImportIdentityState from './states/importIdentity/ImportIdentityState'
import StartState from './states/start/StartState'
import SetupPasswordState from './states/setup/SetupPasswordState'
import LoginState from './states/login/LoginState'
import CreateWalletState from './states/wallet/CreateWalletState'
import './styles/app.pcss'
import ApproveTransactionState from './states/approveTransaction/ApproveTransactionState'
import Layout from './components/layout/Layout'
import {useSdk} from "./hooks/useSdk";
import {Identity} from "../types/Identity";

const App: React.FC = function () {
  const sdk: any = useSdk()

  const [identities, setIdentities] = useState<Identity[]>([])
  const [identityBalance, setIdentityBalance] = useState<bigint>(0n)

  const router = createHashRouter([
    {
      element: <Layout/>,
      children: [
        {
          index: true,
          path: '/',
          element: <StartState/>,
        },
        {
          path: '/home',
          element: <HomeState/>,
          handle: { imageType: 'coins' }
        },
        {
          path: '/setup-password',
          element: <SetupPasswordState/>,
        },
        {
          path: '/login',
          element: <LoginState/>,
        },
        {
          path: '/create-wallet',
          element: <CreateWalletState/>,
        },
        {
          path: '/import',
          element: <ImportIdentityState/>,
        },
        {
          path: '/approve/:txhash',
          element: <ApproveTransactionState/>,
        },
      ],
    },
  ] as RouteObject[])
  const populateBalances = async (): Promise<void> => {
    const balances = await Promise.all(identities.map((async identity => ({
      identifier: identity.identifier,
      balance: (await sdk.identities.getBalance(identity.identifier)).toString()
    }))))

    for (const { identifier, balance } of balances) {
      setIdentityBalance(0n)
    }
  }

  useEffect(() => {
    populateBalances()
      .catch(err => console.error('Failed to populate balances', err))
  }, [])

  return (
    <RouterProvider router={router}/>
  )
}

const root = document.createElement('div')
root.className = 'main_container'
document.body.appendChild(root)

const rootDiv = ReactDOM.createRoot(root)
rootDiv.render(
  <App/>
)

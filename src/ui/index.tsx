import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider, RouteObject } from 'react-router-dom'
import HomeState from './states/home/HomeState'
import ImportIdentityState from './states/importIdentity/ImportIdentityState'
import './styles/app.pcss'
import { useIdentitiesStore } from '../stores/identitiesStore'
import { useSdk } from '../hooks/useSdk'
import { useChromeStorage } from '../hooks/useChromeStorage'
import ApproveTransactionState from './states/approveTransaction/ApproveTransactionState'
import Layout from './components/layout/Layout'

const App: React.FC = function () {
  const sdk: any = useSdk()

  const identities: any = useIdentitiesStore((state: any) => state.identities)
  const setIdentityBalance: any = useIdentitiesStore((state: any) => state.setIdentityBalance)

  const router = createHashRouter([
    {
      element: <Layout/>,
      children: [
        {
          index: true,
          path: '/',
          element: <HomeState/>,
          handle: { imageType: 'coins' }
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
      setIdentityBalance(identifier, balance)
    }
  }

  useEffect(() => {
    const storage = useChromeStorage()
    storage.onChanged.addListener((changes, areaName) => {
        console.log('changes detected, rehydrating')
        useIdentitiesStore.persist.rehydrate()
      }
    )

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

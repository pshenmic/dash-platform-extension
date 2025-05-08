import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import {
  createHashRouter,
  RouterProvider,
} from 'react-router'
import HomeState from './states/home/HomeState'
import ImportIdentityState from './states/importIdentity/ImportIdentityState'
import './styles/app.pcss'
import { useIdentitiesStore } from './stores/identitiesStore'
import { useSdk } from './hooks/useSdk'
import { useChromeStorage } from './hooks/useChromeStorage'
import ApproveTransactionState from './states/approveTransaction/ApproveTransactionState'

const App = function () {
  const sdk = useSdk()

  const identities = useIdentitiesStore((state) => state.identities)
  const setIdentityBalance = useIdentitiesStore((state) => state.setIdentityBalance)

  const router = createHashRouter([
    {
      path: '/',
      element: <HomeState/>,
    },
    {
      path: '/import',
      element: <ImportIdentityState/>,
    },
    {
      path: '/approve/:txhash',
      element: <ApproveTransactionState/>,
    },
  ])
  const populateBalances = async () => {
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
root.className = 'container main_container'
document.body.appendChild(root)

const rootDiv = ReactDOM.createRoot(root)
rootDiv.render(
  <App/>
)

import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider, RouteObject } from 'react-router-dom'
import HomeState from './states/home/HomeState'
import ImportKeystoreState from './states/importIdentity/ImportKeystoreState'
import StartState from './states/start/StartState'
import SetupPasswordState from './states/setup/SetupPasswordState'
import LoginState from './states/login/LoginState'
import CreateWalletState from './states/wallet/CreateWalletState'
import NoWalletState from './states/wallet/NoWalletState'
import ApproveTransactionState from './states/approveTransaction/ApproveTransactionState'
import AppConnectState from './states/appConnect/AppConnectState'
import Layout from './components/layout/Layout'
import ImportSeedPhrase from './states/importIdentity/ImportSeedPhrase'
import ChooseWalletType from './states/wallet/ChooseWalletType'
import WalletSuccessfullyCreated from './states/importIdentity/WalletSuccessfullyCreated'
import './styles/app.pcss'

const App: React.FC = function () {
  const router = createHashRouter([
    {
      element: <Layout />,
      children: [
        {
          index: true,
          path: '/',
          element: <StartState />,
          handle: {
            headerProps: {
              variant: 'minimal'
            }
          }
        },
        {
          path: '/choose-wallet-type',
          element: <ChooseWalletType />,
          handle: {
            headerProps: {
              variant: 'chooseWalletType'
            }
          }
        },
        {
          path: '/import-seed-phrase',
          element: <ImportSeedPhrase />,
          handle: {
            headerProps: {
              variant: 'seedImport'
            }
          }
        },
        {
          path: '/no-wallet',
          element: <NoWalletState />,
          handle: {
            headerProps: {
              variant: 'landing'
            }
          }
        },
        {
          path: '/home',
          element: <HomeState />,
          handle: {
            headerProps: {
              variant: 'main'
            }
          }
        },
        {
          path: '/setup-password',
          element: <SetupPasswordState />,
          handle: {
            headerProps: {
              variant: 'onboarding'
            }
          }
        },
        {
          path: '/login',
          element: <LoginState />,
          handle: {
            headerProps: {
              variant: 'landing'
            }
          }
        },
        {
          path: '/create-wallet',
          element: <CreateWalletState />,
          handle: {
            headerProps: {
              variant: 'simple'
            }
          }
        },
        {
          path: '/import-keystore',
          element: <ImportKeystoreState />,
          handle: {
            headerProps: {
              variant: 'seedImport'
            }
          }
        },
        {
          path: '/approve/:txhash',
          element: <ApproveTransactionState />,
          handle: {
            headerProps: {
              variant: 'transaction'
            }
          }
        },
        {
          path: '/connect/:id',
          element: <AppConnectState />,
          handle: {
            headerProps: {
              variant: 'simple'
            }
          }
        },
        {
          path: '/wallet-created',
          element: <WalletSuccessfullyCreated />,
          handle: {
            headerProps: {
              variant: 'minimal'
            }
          }
        }
      ]
    }
  ] as RouteObject[])
  const populateBalances = async (): Promise<void> => {
    // const balances = await Promise.all(identities.map(async identity => ({
    //   identifier: identity.identifier,
    //   balance: (await sdk.identities.getBalance(identity.identifier)).toString()
    // })))

    // for (const { identifier, balance } of balances) {
    //   setIdentityBalance(0n)
    // }
  }

  useEffect(() => {
    populateBalances()
      .catch(err => console.warn('Failed to populate balances', err))
  }, [])

  return (
    <RouterProvider router={router} />
  )
}

const root = document.createElement('div')
root.className = 'root'
document.body.appendChild(root)

const rootDiv = ReactDOM.createRoot(root)
rootDiv.render(
  <App />
)

import React from 'react'
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
import PageWithHeader from './components/layout/PageWithHeader'
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
          element: <PageWithHeader><StartState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'minimal'
            }
          }
        },
        {
          path: '/choose-wallet-type',
          element: <PageWithHeader><ChooseWalletType /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'chooseWalletType'
            }
          }
        },
        {
          path: '/import-seed-phrase',
          element: <PageWithHeader><ImportSeedPhrase /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'seedImport'
            }
          }
        },
        {
          path: '/no-wallet',
          element: <PageWithHeader><NoWalletState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'landing'
            }
          }
        },
        {
          path: '/home',
          element: <PageWithHeader><HomeState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'main'
            }
          }
        },
        {
          path: '/setup-password',
          element: <PageWithHeader><SetupPasswordState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'onboarding'
            }
          }
        },
        {
          path: '/login',
          element: <PageWithHeader><LoginState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'landing'
            }
          }
        },
        {
          path: '/create-wallet',
          element: <PageWithHeader><CreateWalletState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'simple'
            }
          }
        },
        {
          path: '/import-keystore',
          element: <PageWithHeader><ImportKeystoreState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'seedImport'
            }
          }
        },
        {
          path: '/approve/:txhash',
          element: <PageWithHeader><ApproveTransactionState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'transaction'
            }
          }
        },
        {
          path: '/connect/:id',
          element: <PageWithHeader><AppConnectState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'simple'
            }
          }
        },
        {
          path: '/wallet-created',
          element: <PageWithHeader><WalletSuccessfullyCreated /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'minimal'
            }
          }
        }
      ]
    }
  ] as RouteObject[])

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

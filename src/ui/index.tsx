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
import ChooseImportType from './states/importIdentity/ChooseImportType'
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
              hideLeftSection: true
            }
          }
        },
        {
          path: '/choose-wallet-import-type',
          element: <ChooseImportType />,
          handle: {
            headerProps: {
              imageType: 'coins',
              containerClasses: '',
              imgClasses: '-mt-[68%] !w-[426px] ml-[5%]'
            }
          }
        },
        {
          path: '/import-seed-phrase',
          element: <ImportSeedPhrase />,
          handle: {
            headerProps: {
              imageType: 'coins',
              containerClasses: 'w-[120%] -mr-[55%]',
              imgClasses: '-mt-[52%]'
            }
          }
        },
        {
          path: '/no-wallet',
          element: <NoWalletState />,
          handle: {
            headerProps: {
              imageType: 'coins',
              containerClasses: '',
              imgClasses: '!w-[109%] -mt-[67%] right-[7%]',
              hideLeftSection: true
            }
          }
        },
        {
          path: '/home',
          element: <HomeState />,
          handle: {
            headerProps: {
              imageType: 'coins'
            }
          }
        },
        {
          path: '/setup-password',
          element: <SetupPasswordState />,
          handle: {
            headerProps: {
              imageType: 'coins',
              containerClasses: '',
              imgClasses: '-mt-[68%] !w-[426px] ml-[5%]',
              hideLeftSection: true
            }
          }
        },
        {
          path: '/login',
          element: <LoginState />,
          handle: {
            headerProps: {
              imageType: 'coins',
              containerClasses: '',
              imgClasses: '!w-[109%] -mt-[67%] right-[7%]',
              hideLeftSection: true
            }
          }
        },
        {
          path: '/create-wallet',
          element: <CreateWalletState />
        },
        {
          path: '/import-keystore',
          element: <ImportKeystoreState />,
          handle: {
            headerProps: {
              imageType: 'coins',
              containerClasses: 'w-[120%] -mr-[55%]',
              imgClasses: '-mt-[52%]'
            }
          }
        },
        {
          path: '/approve/:txhash',
          element: <ApproveTransactionState />
        },
        {
          path: '/connect/:id',
          element: <AppConnectState />
        },
        {
          path: '/wallet-created',
          element: <WalletSuccessfullyCreated />,
          handle: {
            headerProps: {
              hideLeftSection: true
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

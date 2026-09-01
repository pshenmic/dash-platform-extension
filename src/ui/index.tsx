import React from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider, RouteObject } from 'react-router-dom'
import HomeOldState from './states/home-old/HomeState'
import HomeState from './states/home/HomeState'
import CoreHomeState from './states/core/CoreHomeState'
import ImportRegularState from './states/importIdentity/ImportRegularState'
import ImportMasternodeState from './states/importIdentity/ImportMasternodeState'
import SelectImportTypesState from './states/importIdentity/SelectImportTypesState'
import StartState from './states/start/StartState'
import SetupPasswordState from './states/setup/SetupPasswordState'
import LoginState from './states/login/LoginState'
import CreateWalletState from './states/wallet/CreateWalletState'
import ApproveTransactionState from './states/approveTransaction/ApproveTransactionState'
import AppConnectState from './states/appConnect/AppConnectState'
import SendTransactionState from './states/sendTransaction/SendTransactionState'
import PlatformTransferConfirmState from './states/platformTransfer/PlatformTransferConfirmState'
import Layout from './components/layout/Layout'
import PageWithHeader from './components/layout/PageWithHeader'
import ImportSeedPhrase from './states/importIdentity/ImportSeedPhrase'
import ChooseWalletType from './states/wallet/ChooseWalletType'
import WelcomeState from './states/welcome/WelcomeState'
import CreateSeedWalletState from './states/wallet/CreateSeedWalletState'
import WalletSuccessfullyCreated from './states/importIdentity/WalletSuccessfullyCreated'
import NameRegistrationState from './states/nameRegistration'
import IdentityRegistrationState from './states/identityRegistration/IdentityRegistrationState'
import TopUpIdentityState from './states/topup/TopUpIdentityState'
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
          path: '/welcome',
          element: <PageWithHeader><WelcomeState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'welcome'
            }
          }
        },
        {
          path: '/create-seed-wallet',
          element: <PageWithHeader><CreateSeedWalletState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'seedImport'
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
          path: '/home',
          element: <PageWithHeader><HomeOldState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'main'
            }
          }
        },
        {
          path: '/home-old',
          element: <PageWithHeader><HomeOldState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'main'
            }
          }
        },
        {
          path: '/dashboard',
          element: <PageWithHeader><HomeState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'dashboard'
            }
          }
        },
        {
          path: '/platform',
          element: <PageWithHeader><HomeOldState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'main'
            }
          }
        },
        {
          path: '/core',
          element: <PageWithHeader><CoreHomeState /></PageWithHeader>,
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
          path: '/import-regular-identity',
          element: <PageWithHeader><ImportRegularState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'seedImport'
            }
          }
        },
        {
          path: '/import-masternode-identity',
          element: <PageWithHeader><ImportMasternodeState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'seedImport'
            }
          }
        },
        {
          path: '/select-import-type',
          element: <PageWithHeader><SelectImportTypesState /></PageWithHeader>,
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
        },
        {
          path: '/name-registration',
          element: <PageWithHeader><NameRegistrationState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'simple'
            }
          }
        },
        {
          path: '/register-identity',
          element: <PageWithHeader><IdentityRegistrationState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'identityRegistration'
            }
          }
        },
        {
          path: '/topup-identity',
          element: <PageWithHeader><TopUpIdentityState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'topupIdentity'
            }
          }
        },
        {
          path: '/send-transaction',
          element: <PageWithHeader><SendTransactionState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'sendTransaction'
            }
          }
        },
        {
          path: '/platform-transfer-confirm',
          element: <PageWithHeader><PlatformTransferConfirmState /></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'sendTransaction'
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

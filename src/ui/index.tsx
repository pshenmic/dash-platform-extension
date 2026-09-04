import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider, RouteObject } from 'react-router-dom'
import './styles/app.pcss'
import LoadingScreen from './components/layout/LoadingScreen'
import { loadSdk } from '../utils/sdkLoader'
import Layout from './components/layout/Layout'
import PageWithHeader from './components/layout/PageWithHeader'

// Lazy load all routes for better performance
const HomeState = React.lazy(async () => await import('./states/home/HomeState'))
const ImportRegularState = React.lazy(async () => await import('./states/importIdentity/ImportRegularState'))
const ImportMasternodeState = React.lazy(async () => await import('./states/importIdentity/ImportMasternodeState'))
const SelectImportTypesState = React.lazy(async () => await import('./states/importIdentity/SelectImportTypesState'))
const StartState = React.lazy(async () => await import('./states/start/StartState'))
const SetupPasswordState = React.lazy(async () => await import('./states/setup/SetupPasswordState'))
const LoginState = React.lazy(async () => await import('./states/login/LoginState'))
const CreateWalletState = React.lazy(async () => await import('./states/wallet/CreateWalletState'))
const ApproveTransactionState = React.lazy(async () => await import('./states/approveTransaction/ApproveTransactionState'))
const AppConnectState = React.lazy(async () => await import('./states/appConnect/AppConnectState'))
const SendTransactionState = React.lazy(async () => await import('./states/sendTransaction/SendTransactionState'))
const ImportSeedPhrase = React.lazy(async () => await import('./states/importIdentity/ImportSeedPhrase'))
const ChooseWalletType = React.lazy(async () => await import('./states/wallet/ChooseWalletType'))
const WalletSuccessfullyCreated = React.lazy(async () => await import('./states/importIdentity/WalletSuccessfullyCreated'))
const NameRegistrationState = React.lazy(async () => await import('./states/nameRegistration'))
const WelcomeState = React.lazy(async () => await import('./states/welcome/WelcomeState'))
const CreateSeedWalletState = React.lazy(async () => await import('./states/wallet/CreateSeedWalletState'))
const IdentityRegistrationState = React.lazy(async () => await import('./states/identityRegistration/IdentityRegistrationState'))
const TopUpIdentityState = React.lazy(async () => await import('./states/topup/TopUpIdentityState'))
const PlatformTransferConfirmState = React.lazy(async () => await import('./states/platformTransfer/PlatformTransferConfirmState'))

const App: React.FC = function () {
  const router = createHashRouter([
    {
      element: <Layout />,
      children: [
        {
          index: true,
          path: '/',
          element: <PageWithHeader><Suspense fallback={<LoadingScreen />}><StartState /></Suspense></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'minimal'
            }
          }
        },
        {
          path: '/choose-wallet-type',
          element: <PageWithHeader><Suspense fallback={<LoadingScreen />}><ChooseWalletType /></Suspense></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'chooseWalletType'
            }
          }
        },
        {
          path: '/welcome',
          element: <PageWithHeader><Suspense fallback={<LoadingScreen />}><WelcomeState /></Suspense></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'welcome'
            }
          }
        },
        {
          path: '/import-seed-phrase',
          element: <PageWithHeader><Suspense fallback={<LoadingScreen />}><ImportSeedPhrase /></Suspense></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'seedImport'
            }
          }
        },
        {
          path: '/create-seed-wallet',
          element: <PageWithHeader><Suspense fallback={<LoadingScreen />}><CreateSeedWalletState /></Suspense></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'seedImport'
            }
          }
        },
        {
          path: '/home',
          element: <PageWithHeader><Suspense fallback={<LoadingScreen />}><HomeState /></Suspense></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'main'
            }
          }
        },
        {
          path: '/setup-password',
          element: <PageWithHeader><Suspense fallback={<LoadingScreen />}><SetupPasswordState /></Suspense></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'onboarding'
            }
          }
        },
        {
          path: '/login',
          element: <PageWithHeader><Suspense fallback={<LoadingScreen />}><LoginState /></Suspense></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'landing'
            }
          }
        },
        {
          path: '/create-wallet',
          element: <PageWithHeader><Suspense fallback={<LoadingScreen />}><CreateWalletState /></Suspense></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'simple'
            }
          }
        },
        {
          path: '/import-regular-identity',
          element: <PageWithHeader><Suspense fallback={<LoadingScreen />}><ImportRegularState /></Suspense></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'seedImport'
            }
          }
        },
        {
          path: '/import-masternode-identity',
          element: <PageWithHeader><Suspense fallback={<LoadingScreen />}><ImportMasternodeState /></Suspense></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'seedImport'
            }
          }
        },
        {
          path: '/select-import-type',
          element: <PageWithHeader><Suspense fallback={<LoadingScreen />}><SelectImportTypesState /></Suspense></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'seedImport'
            }
          }
        },
        {
          path: '/approve/:txhash',
          element: <PageWithHeader><Suspense fallback={<LoadingScreen />}><ApproveTransactionState /></Suspense></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'transaction'
            }
          }
        },
        {
          path: '/connect/:id',
          element: <PageWithHeader><Suspense fallback={<LoadingScreen />}><AppConnectState /></Suspense></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'simple'
            }
          }
        },
        {
          path: '/wallet-created',
          element: <PageWithHeader><Suspense fallback={<LoadingScreen />}><WalletSuccessfullyCreated /></Suspense></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'minimal'
            }
          }
        },
        {
          path: '/name-registration',
          element: <PageWithHeader><Suspense fallback={<LoadingScreen />}><NameRegistrationState /></Suspense></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'simple'
            }
          }
        },
        {
          path: '/register-identity',
          element: <PageWithHeader><Suspense fallback={<LoadingScreen />}><IdentityRegistrationState /></Suspense></PageWithHeader>,
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
          element: <PageWithHeader><Suspense fallback={<LoadingScreen />}><SendTransactionState /></Suspense></PageWithHeader>,
          handle: {
            headerProps: {
              variant: 'sendTransaction'
            }
          }
        },
        {
          path: '/platform-transfer-confirm',
          element: <PageWithHeader><Suspense fallback={<LoadingScreen />}><PlatformTransferConfirmState/></Suspense></PageWithHeader>,
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

// Hide initial HTML loader after React is ready
const initialLoader = document.getElementById('initial-loader')
if (initialLoader != null) {
  initialLoader.classList.add('hidden')
}

// Load SDK in background - non-blocking
loadSdk()
  .then(() => {
    console.log('✅ Dash Platform SDK loaded successfully')
  })
  .catch(error => {
    console.error('❌ Failed to load SDK:', error)
  })

import { ExtensionStorageAdapter } from './storage/extensionStorageAdapter'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateAPI } from './api/PrivateAPI'
import { PublicAPI } from './api/PublicAPI'
import hash from 'hash.js'
import { AppConnectStorageSchema } from './storage/storageSchema'
import { AppConnectStatus } from '../types/enums/AppConnectStatus'
import { EventData } from '../types/EventData'
import { MessagingMethods } from '../types/enums/MessagingMethods'
import { injectScript } from '../utils'
import { Network } from '../types/enums/Network'

export async function initApp (): Promise<void> {
  const extensionStorageAdapter = new ExtensionStorageAdapter()
  const network = await extensionStorageAdapter.get('network') as string

  const sdk = new DashPlatformSDK({ network: Network[network] })

  const privateAPI = new PrivateAPI(sdk, extensionStorageAdapter)
  const publicAPI = new PublicAPI(sdk, extensionStorageAdapter)

  privateAPI.init()
  publicAPI.init()

  // get current wallet
  const checkAppConnectedAndInjectScript = async (): Promise<void> => {
    const network = await extensionStorageAdapter.get('network') as string
    const walletId = await extensionStorageAdapter.get('currentWalletId') as string | null
    const origin = window.location.origin

    if (walletId == null) {
      return
    }

    const appConnects = await extensionStorageAdapter.get(`appConnects_${network}_${walletId}`)

    if (appConnects == null) {
      return
    }

    const id = hash.sha256().update(origin).digest('hex').substring(0, 6)
    const appConnect = appConnects[id] as AppConnectStorageSchema

    if (appConnect == null || appConnect.status !== AppConnectStatus.approved) {
      return
    }

    injectScript(document, 'injectSdk.js')
  }

  const handleMessage = (event: MessageEvent): void => {
    const data: EventData = event.data

    if (data?.type !== 'response' && data?.method !== MessagingMethods.CONNECT_APP && data?.payload?.status !== 'approved') {
      return
    }

    injectScript(document, 'injectSdk.js')
  }

  window.addEventListener('message', handleMessage)

  injectScript(document, 'injectExtension.js')

  checkAppConnectedAndInjectScript().catch((e) => {
    console.error('Failed to inject Dash Platform SDK', e)
  })
}

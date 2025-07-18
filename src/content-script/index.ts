// This file only runs in the extension context (content-script)
import { ExtensionStorageAdapter } from './storage/extensionStorageAdapter'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateAPI } from './api/PrivateAPI'
import { PublicAPI } from './api/PublicAPI'
import runMigrations from './storage/runMigrations'
import hash from 'hash.js'
import { AppConnectStorageSchema } from './storage/storageSchema'
import { AppConnectStatus } from '../types/enums/AppConnectStatus'
import { EventData } from '../types/EventData'
import { MessagingMethods } from '../types/enums/MessagingMethods'

const extensionStorageAdapter = new ExtensionStorageAdapter()

// do migrations
runMigrations(extensionStorageAdapter).catch(console.error)

const sdk = new DashPlatformSDK({ network: 'testnet' })

const privateAPI = new PrivateAPI(sdk, extensionStorageAdapter)
const publicAPI = new PublicAPI(sdk, extensionStorageAdapter)

privateAPI.init()
publicAPI.init()

function injectScript (src: string): void {
  if (document.getElementById(src) != null) {
    return
  }

  const s = document.createElement('script')
  s.id = src
  s.src = chrome.runtime.getURL(src);
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  (document.head || document.documentElement).append(s)

  console.log(`Injected ${src}`)
}

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

  injectScript('injectSdk.js')
}

const handleMessage = (event: MessageEvent): void => {
  const data: EventData = event.data

  if (data?.type !== 'response' && data?.method !== MessagingMethods.CONNECT_APP && data?.payload?.status !== 'approved') {
    return
  }

  injectScript('injectSdk.js')
}

window.addEventListener('message', handleMessage)

injectScript('injectExtension.js')

checkAppConnectedAndInjectScript().catch((e) => {
  console.error('Failed to inject Dash Platform SDK', e)
})

console.log('content script loaded')

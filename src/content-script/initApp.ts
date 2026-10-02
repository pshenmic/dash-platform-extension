import { ExtensionStorageAdapter } from './storage/extensionStorageAdapter'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { DashCoreSDK } from 'dash-core-sdk'
import { PrivateAPI } from './api/PrivateAPI'
import { PublicAPI } from './api/PublicAPI'
import hash from 'hash.js'
import { AppConnectStorageSchema } from './storage/storageSchema'
import { AppConnectStatus } from '../types/enums/AppConnectStatus'
import { EventData } from '../types'
import { PageEvent } from '../types/PageState'
import { MessagingMethods } from '../types/enums/MessagingMethods'
import { generateRandomHex, injectScript } from '../utils'
import { createPageStateWatcher, isPageStateKey } from './watchPageState'
import { createStateTransitionWatcher, isStateTransitionKey } from './watchStateTransitions'
import { Network } from '../types/enums/Network'

export async function initApp (): Promise<void> {
  const extensionStorageAdapter = new ExtensionStorageAdapter()
  const network = await extensionStorageAdapter.get('network') as string

  const sdk = new DashPlatformSDK({ network: Network[network] })

  const coreSDK = new DashCoreSDK({ network: Network[network] })

  const privateAPI = new PrivateAPI(sdk, coreSDK, extensionStorageAdapter)
  const publicAPI = new PublicAPI(sdk, extensionStorageAdapter)

  // Handler table only — the popup now talks to the offscreen backend over
  // real runtime messaging, which does not reach content scripts.
  privateAPI.buildHandlers()
  publicAPI.init()

  const emit = (pageEvent: PageEvent): void => {
    const message: EventData = {
      id: generateRandomHex(8),
      context: 'dash-platform-extension',
      type: 'event',
      method: pageEvent.event,
      payload: pageEvent.payload
    }

    window.postMessage(message)
  }

  // Tell this page when what it may see changes, and when the user answers a
  // request it sent, so it does not have to ask again. Only a website with an
  // approved connection, or one waiting for an answer, ever hears anything.
  const watcher = createPageStateWatcher(publicAPI.pageStateService, window.location.origin, emit)
  const stateTransitionWatcher = createStateTransitionWatcher(publicAPI.stateTransitionsRepository, publicAPI.stateTransitionRequests, emit)

  // The first snapshot is the baseline a later one is compared with.
  watcher.refresh().catch(e => console.error('Failed to read what this page may see', e))

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') {
      return
    }

    const keys = Object.keys(changes)

    if (keys.some(isPageStateKey)) {
      watcher.refresh().catch(e => console.error('Failed to read what this page may see', e))
    }

    if (keys.some(isStateTransitionKey)) {
      stateTransitionWatcher.refresh().catch(e => console.error('Failed to read the answer to a signing request', e))
    }
  })

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

import { ProxyStorageAdapter } from './proxyStorageAdapter'
import runMigrations from '../content-script/storage/runMigrations'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { DashCoreSDK } from 'dash-core-sdk'
import { PrivateAPI } from '../content-script/api/PrivateAPI'
import { PublicBackendAPI } from './publicBackendAPI'
import { Network } from '../types/enums/Network'
import type { EventData } from '../types/EventData'

/**
 * The page-facing half of the backend, as the transport sees it.
 */
export interface PublicDispatcher {
  owns: (method: string) => boolean
  handleMessage: (data: EventData, origin: string) => Promise<any>
}

/**
 * The booted backend: wallet handlers for extension pages, plus the
 * page-facing handlers that need the SDK and therefore cannot run in a content
 * script.
 */
export interface Backend {
  privateAPI: PrivateAPI
  publicAPI: PublicDispatcher
}

/**
 * Boots the wallet backend: runs storage migrations, constructs the SDKs and
 * builds the handler tables.
 *
 * Deliberately platform-agnostic — it touches no DOM and no browser-specific
 * API, so the same function boots Chrome's offscreen document and (later)
 * Firefox's event page. Only the entry point that calls it differs.
 *
 * Note this does NOT register a message listener. Transport is the caller's
 * job, because the two contexts reply over different paths.
 */
export async function startBackend (): Promise<Backend> {
  // Chrome grants an offscreen document only the chrome.runtime messaging
  // APIs, so storage is proxied through the service worker. Firefox's event
  // page has full API access and can swap in ExtensionStorageAdapter here.
  const storageAdapter = new ProxyStorageAdapter()

  await runMigrations(storageAdapter)

  const network = await storageAdapter.get('network') as string
  const sdk = new DashPlatformSDK({ network: Network[network] })
  const coreSDK = new DashCoreSDK({ network: Network[network] })

  const privateAPI = new PrivateAPI(sdk, coreSDK, storageAdapter)
  privateAPI.buildHandlers()

  return { privateAPI, publicAPI: new PublicBackendAPI(storageAdapter) }
}

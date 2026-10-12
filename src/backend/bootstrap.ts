import { ProxyStorageAdapter } from './proxyStorageAdapter'
import runMigrations from '../content-script/storage/runMigrations'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { DashCoreSDK } from 'dash-core-sdk'
import { PrivateAPI } from '../content-script/api/PrivateAPI'
import { Network } from '../types/enums/Network'
import { PLATFORM_DAPI_URLS } from '../constants'

/**
 * Boots the wallet backend: runs storage migrations, constructs the SDKs and
 * builds the PrivateAPI handler table.
 *
 * Deliberately platform-agnostic — it touches no DOM and no browser-specific
 * API, so the same function boots Chrome's offscreen document and (later)
 * Firefox's event page. Only the entry point that calls it differs.
 *
 * Note this does NOT register a message listener. Transport is the caller's
 * job, because the two contexts reply over different paths.
 */
export async function startBackend (): Promise<PrivateAPI> {
  // Chrome grants an offscreen document only the chrome.runtime messaging
  // APIs, so storage is proxied through the service worker. Firefox's event
  // page has full API access and can swap in ExtensionStorageAdapter here.
  const storageAdapter = new ProxyStorageAdapter()

  await runMigrations(storageAdapter)

  const network = await storageAdapter.get('network') as string
  // Naming the nodes ourselves, so one of them being down is not the end of it.
  const sdk = new DashPlatformSDK({
    network: Network[network],
    grpc: { poolLimit: 5, dapiUrl: PLATFORM_DAPI_URLS[Network[network]] }
  })
  const coreSDK = new DashCoreSDK({ network: Network[network] })

  const privateAPI = new PrivateAPI(sdk, coreSDK, storageAdapter)
  privateAPI.buildHandlers()

  return privateAPI
}

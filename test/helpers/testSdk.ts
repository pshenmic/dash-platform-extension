import { DashPlatformSDK } from 'dash-platform-sdk'
import { DashCoreSDK } from 'dash-core-sdk'
import { PLATFORM_DAPI_URLS } from '../../src/constants'
import { asCoreDapiUrl, pickLiveDapiUrls } from '../../src/utils/dapiNodes'

// Probed once per run: every suite builds its own SDK, and asking each node
// again would add a round trip to each of them.
let live: Promise<string[]> | null = null

// The SDK as the backend builds it: pointed at the same list of nodes, so a
// suite that talks to Platform keeps working when one of them is down. Built
// with `{ network }` alone it would only ever try the single node the SDK
// hardcodes.
export const testSdk = async (network: 'testnet' | 'mainnet' = 'testnet'): Promise<DashPlatformSDK> => {
  live = live ?? pickLiveDapiUrls(PLATFORM_DAPI_URLS[network])

  return new DashPlatformSDK({
    network,
    grpc: { poolLimit: 5, dapiUrl: await live }
  })
}

// The Core SDK reaches DAPI through the same endpoints and ships the same
// single seed, so it gets the same probed list.
export const testCoreSdk = async (network: 'testnet' | 'mainnet' = 'testnet'): Promise<DashCoreSDK> => {
  live = live ?? pickLiveDapiUrls(PLATFORM_DAPI_URLS[network])

  return new DashCoreSDK({ network, dapiUrl: asCoreDapiUrl(await live) })
}

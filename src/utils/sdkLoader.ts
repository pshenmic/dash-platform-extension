import type { DashPlatformSDK } from 'dash-platform-sdk'

let sdkInstance: DashPlatformSDK | null = null
let sdkLoadPromise: Promise<DashPlatformSDK> | null = null
let desiredNetwork: 'mainnet' | 'testnet' = 'mainnet'

/**
 * Records the network the popup SDK should use without forcing the SDK to load.
 * Applied immediately if it is already loaded, otherwise at construction.
 */
export function setSdkNetwork (network: 'mainnet' | 'testnet'): void {
  desiredNetwork = network
  sdkInstance?.setNetwork(network)
}

/**
 * Returns the memoized promise that resolves once the SDK chunk has been
 * downloaded and instantiated.
 *
 * The identity of the returned promise is stable across calls, which is what
 * makes it safe to hand to React's `use()` — a fresh promise on every render
 * would suspend forever. Note this is deliberately NOT an `async function`:
 * those allocate a new promise per call even when returning a cached one.
 *
 * Only call this from code that genuinely needs the SDK, never eagerly at
 * popup startup. Chrome shows the popup window only once the page fires
 * `load`, and a chunk requested before then delays `load` until it has
 * downloaded and run — including the synchronous WASM compile, which on a
 * cold browser start kept the popup from appearing for seconds.
 */
// eslint-disable-next-line @typescript-eslint/promise-function-async -- must NOT be `async`; see above
export function getSdkPromise (): Promise<DashPlatformSDK> {
  if (sdkLoadPromise === null) {
    sdkLoadPromise = import('dash-platform-sdk').then(module => {
      sdkInstance = new module.DashPlatformSDK({ network: desiredNetwork })
      return sdkInstance
    })
  }

  return sdkLoadPromise
}

/**
 * Returns the loaded SDK instance.
 * Throws an error if the SDK hasn't been initialized yet.
 */
export function getSdkInstance (): DashPlatformSDK {
  if (sdkInstance === null) {
    throw new Error('SDK not initialized. Await getSdkPromise() first.')
  }
  return sdkInstance
}

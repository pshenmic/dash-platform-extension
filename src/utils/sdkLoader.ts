import type { DashPlatformSDK } from 'dash-platform-sdk'

let sdkInstance: DashPlatformSDK | null = null
let sdkLoadPromise: Promise<DashPlatformSDK> | null = null

/**
 * Returns the memoized promise that resolves once the SDK chunk has been
 * downloaded and instantiated.
 *
 * The identity of the returned promise is stable across calls, which is what
 * makes it safe to hand to React's `use()` — a fresh promise on every render
 * would suspend forever. Note this is deliberately NOT an `async function`:
 * those allocate a new promise per call even when returning a cached one.
 */
// eslint-disable-next-line @typescript-eslint/promise-function-async -- must NOT be `async`; see above
export function getSdkPromise (): Promise<DashPlatformSDK> {
  if (sdkLoadPromise === null) {
    sdkLoadPromise = import('dash-platform-sdk').then(module => {
      sdkInstance = new module.DashPlatformSDK({ network: 'mainnet' })
      return sdkInstance
    })
  }

  return sdkLoadPromise
}

/**
 * Asynchronously loads the Dash Platform SDK using dynamic imports.
 * Ensures the SDK is only loaded once and returns the same instance on subsequent calls.
 */
export async function loadSdk (): Promise<DashPlatformSDK> {
  return await getSdkPromise()
}

/**
 * Returns the loaded SDK instance.
 * Throws an error if the SDK hasn't been initialized yet.
 */
export function getSdkInstance (): DashPlatformSDK {
  if (sdkInstance === null) {
    throw new Error('SDK not initialized. Call loadSdk() first.')
  }
  return sdkInstance
}

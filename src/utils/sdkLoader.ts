import { type DashPlatformSDK } from 'dash-platform-sdk'

let sdkInstance: DashPlatformSDK | null = null
let sdkLoadPromise: Promise<DashPlatformSDK> | null = null

/**
 * Asynchronously loads the Dash Platform SDK using dynamic imports.
 * Ensures the SDK is only loaded once and returns the same instance on subsequent calls.
 */
export async function loadSdk (): Promise<DashPlatformSDK> {
  if (sdkInstance !== null) {
    return sdkInstance
  }

  if (sdkLoadPromise !== null) {
    return await sdkLoadPromise
  }

  sdkLoadPromise = import('dash-platform-sdk').then(module => {
    sdkInstance = new module.DashPlatformSDK({ network: 'mainnet' })
    return sdkInstance
  })

  return await sdkLoadPromise
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

import { DashPlatformSDK } from 'dash-platform-sdk'
import { DashCoreSDK } from 'dash-core-sdk'

// The SDKs as the backend builds them. Both pick their own nodes: since
// dash-platform-sdk 1.5.3 the pool is health-checked and no longer leans on a
// single hardcoded seed, and dash-core-sdk 1.1.4 refills its pool the same way.
export const testSdk = async (network: 'testnet' | 'mainnet' = 'testnet'): Promise<DashPlatformSDK> => {
  return new DashPlatformSDK({ network })
}

export const testCoreSdk = async (network: 'testnet' | 'mainnet' = 'testnet'): Promise<DashCoreSDK> => {
  return new DashCoreSDK({ network })
}

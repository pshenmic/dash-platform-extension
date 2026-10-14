// This file injects on webpages by extension

import { DashPlatformSDK } from 'dash-platform-sdk'
import { PLATFORM_DAPI_URLS } from '../constants'

declare global {
  interface Window {
    dashPlatformSDK: DashPlatformSDK
  }
}

// create DashPlatformSDK
window.dashPlatformSDK = new DashPlatformSDK({
  network: 'mainnet',
  grpc: { poolLimit: 5, dapiUrl: PLATFORM_DAPI_URLS.mainnet }
})

console.log('injected Dash Platform SDK')

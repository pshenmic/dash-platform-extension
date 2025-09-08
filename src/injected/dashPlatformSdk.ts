// This file injects on webpages by extension

import { DashPlatformSDK } from 'dash-platform-sdk'

declare global {
  interface Window {
    dashPlatformSDK: DashPlatformSDK
  }
}

// create DashPlatformSDK
window.dashPlatformSDK = new DashPlatformSDK({ network: 'mainnet', signer: window.dashPlatformExtension.signer })

console.log('injected Dash Platform SDK')

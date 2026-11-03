// This file injects on webpages by extension

import { DashPlatformSDK } from 'dash-platform-sdk'
import { MIN_PLATFORM_PROTOCOL_VERSION } from '../constants'

declare global {
  interface Window {
    dashPlatformSDK: DashPlatformSDK
  }
}

// create DashPlatformSDK
window.dashPlatformSDK = new DashPlatformSDK({ network: 'mainnet', grpc: { minProtocolVersion: MIN_PLATFORM_PROTOCOL_VERSION } })

console.log('injected Dash Platform SDK')

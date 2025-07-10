// This file injects on webpages by extension
import { ExtensionSigner } from './ExtensionSigner'
import { PublicAPIClient } from '../types/PublicAPIClient'

declare global {
  interface Window {
    dashPlatformExtension: { signer: ExtensionSigner }
  }
}

// initialize messaging layer
const publicAPIClient = new PublicAPIClient()

// create custom signer function for DashPlatformSDK
const extensionSigner = new ExtensionSigner(publicAPIClient)

window.dashPlatformExtension = { signer: extensionSigner }

console.log('Dash Platform Extension messaging bridge initialized')

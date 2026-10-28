// This file injects on webpages by extension
import { ExtensionSigner } from './ExtensionSigner'
import { PageEvents } from './PageEvents'
import { PublicAPIClient } from '../types/PublicAPIClient'

declare global {
  interface Window {
    dashPlatformExtension: { signer: ExtensionSigner, on: PageEvents['on'], off: PageEvents['off'] }
  }
}

// initialize messaging layer
const publicAPIClient = new PublicAPIClient()

// create custom signer function for DashPlatformSDK
const extensionSigner = new ExtensionSigner(publicAPIClient)

// a page follows the wallet through these instead of asking again
const pageEvents = new PageEvents()

window.dashPlatformExtension = {
  signer: extensionSigner,
  on: (event, listener) => pageEvents.on(event, listener),
  off: (event, listener) => pageEvents.off(event, listener)
}

console.log('Dash Platform Extension messaging bridge initialized')

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

// The only thing the extension puts on a page. It must stay free of the SDK:
// pshenmic-dpp allocates a shared WebAssembly.Memory at import time, which
// needs crossOriginIsolated, and a third-party page never has it.
const extensionSigner = new ExtensionSigner(publicAPIClient)

window.dashPlatformExtension = { signer: extensionSigner }

console.log('Dash Platform Extension messaging bridge initialized')

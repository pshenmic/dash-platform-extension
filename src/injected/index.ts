// This file injects on webpages by extension

import {DashPlatformSDK} from 'dash-platform-sdk'

declare global {
    interface Window {
        dashPlatformSDK: DashPlatformSDK
    }
}

import {ExtensionSigner} from "./ExtensionSigner";
import {PublicAPIClient} from "../types/PublicAPIClient";

const signer = { signStateTransition: () => {} }

// create DashPlatformSDK
window.dashPlatformSDK = new DashPlatformSDK({ network: 'testnet', signer })

// initialize messaging layer
const publicAPIClient = new PublicAPIClient()

// create custom signer function for DashPlatformSDK
const extensionSigner = new ExtensionSigner(publicAPIClient, window.dashPlatformSDK.wasm)
window.dashPlatformSDK.signer = extensionSigner

console.log('injected Dash Platform SDK')

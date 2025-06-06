// This file injects on webpages by extension

import {MessagingAPI} from "../types/MessagingAPI";
import {DashPlatformSDK} from 'dash-platform-sdk'

declare global {
    interface Window {
        dashPlatformSDK: DashPlatformSDK
    }
}

import {ExtensionSigner} from "./ExtensionSigner";

const signer = { signStateTransition: () => {} }

// create DashPlatformSDK
window.dashPlatformSDK = new DashPlatformSDK({ network: 'testnet', signer })

// initialize messaging layer
const messagingAPI = new MessagingAPI()

// create custom signer function for DashPlatformSDK
const extensionSigner = new ExtensionSigner(messagingAPI, window.dashPlatformSDK.wasm)
window.dashPlatformSDK.signer = extensionSigner

console.log('injected Dash Platform SDK')

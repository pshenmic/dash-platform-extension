// This file injects on webpages by extension

declare global {
    interface Window {
        dashPlatformSDK: DashPlatformSDK
    }
}

import {ExtensionSigner} from "./ExtensionSigner";
import DashPlatformSDK from 'dash-platform-sdk'
import {Messaging} from "../types/Messaging";
import {handlers} from './messaging'

const signer = { signStateTransition: () => {} }

// init message handlers (from content-script to webpage)
const messaging = new Messaging(handlers, 'webpage')
messaging.init()

// create DashPlatformSDK
window.dashPlatformSDK = new DashPlatformSDK({ network: 'testnet', signer })


// create custom signer function for DashPlatformSDK
const extensionSigner = new ExtensionSigner()
window.dashPlatformSDK.signer = extensionSigner

console.log('injected')

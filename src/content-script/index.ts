// This file only runs in the extension context (content-script)


import DashPlatformSDK from "dash-platform-sdk/dist/main";

const sdk = new DashPlatformSDK({network: 'mainnet'})

// sdk.signer.setSigner(new PrivateKeySigner(''))
// await sdk.signer.connect()
// const owner = await sdk.signer.getCurrentIdentity()

// const document = sdk.document.create(dataContract, documentType, data, owner)

// const identityContractNonce = await sdk.identities.getIdentityContractNonce(dataContract, owner)
// const stateTransition = sdk.stateTransition.batch.document.create(document, identityContractNonce)

// ExtensionSigner
// await sdk.signer.signStateTransition(stateTransition)

// PrivateKeySigner
// const owner = await sdk.signer.getIdentity()
// await sdk.signer.signStateTransition(stateTransition, owner)

// KeystoreSigner
// await sdk.signer.signStateTransition(stateTransition, privateKeyWASM)

// await sdk.stateTransition.broadcast(stateTransition)

// init messaging (from webpage to content-script)
import {MessagingBackend} from "./MessagingBackend";

const messaging = new MessagingBackend(sdk.wasm)

messaging.init()

function injectScript (src) {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL(src);
    (document.head || document.documentElement).append(s);
}

injectScript('injected.js')

console.log('content script loaded')

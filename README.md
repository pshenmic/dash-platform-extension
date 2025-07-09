# Dash Platform Extension


###### A browser extension that let users easily interact with Dash Platform DApps.

___

The following features are currently available:

Import Identity by private key:
![title](public/img/screenshots/import-identity-flow.png)

View and confirm transactions:
![title](public/img/screenshots/identity-actions.png)

## General

A browser extension and a wallet specifically for Dash Platform network, that securely keep access to your 
identities in browser and provide developers with SDK and APIs to interact with chain and make transactions in a 
Metamask-like style

Extension keep your wallet data and encrypted private keys in the browser storage, and provide a secure public API 
interface for developers to integrate their application and create transactions. 

## Current features

- Testnet
- Identity management (with secure key storage)
- Show your Identity balance & transactions
- Developer SDK for interaction with extension & blockchain (with cryptographic proofs)
- Sign transactions with your wallet without sharing with the website
- DApp permission system (choose which DApps allowed to read wallet data)


### Next features (unordered)
- Chrome Web Store publish
- Seedphrase support
- Network switch (mainnet / testnet)
- Multiple accounts / identities
- Identity registration
- DPNS Names
- Send & Withdraw credits
- Tokens (with direct purchase)


## Install (manual)

1) Open [Releases](https://github.com/pshenmic/dash-platform-extension/releases)
2) Download last stable build
3) Unzip the archive
4) Open "Manage Extensions" in the Chrome Browser
5) Enable "Developer mode" in top right
6) Click "Load Unpacked" in top left
7) Optionally pin the extension to the toolbar for easier access


## Developer API

When user installs the extension and visit the DApp website, it injects a Dash Platform SDK instance in the `window` object, that let developers start working with it straight right away.

For instance:
```js
export const handleSendMessageButton = async () => {
  const {dashPlatformExtension} = window
  
  if (dashPlatformExtension == null) {
    throw new Error('Dash Platform Extension is not installed')
  }

  const {currentIdentity: identity} = await dashPlatformExtension.connect()
 
  // window.dashPlatformSdk populates after successful connection
  const {dashPlatformSDK} = window
  
  if (dashPlatformSDK == null) {
    throw new Error('Dash Platform SDK is not injected')
  }

  if (dashPlatformSDK == null) {
    throw new Error('Dash Platform SDK is not injected')
  }
  
  const dataContract = '9jf2T5mLuoEXN2r24w9Kd5MNtJUnoMoB7YtFQNRznem3'
  const documentTypeName = 'note'
  const data = {
    "message": "test",
  }

  const identityContractNonce = await dashPlatformSDK.identities.getIdentityContractNonce(identity, dataContract)
  const document = await dashPlatformSDK.documents.create(dataContract, 'note', data, identity, 1)
  const stateTransitions = await sdk.documents.createStateTransition(document, BatchType.Create, identityContractNonce + 1n)

  await dashPlatformExtension.signer.signAndBroadcast(stateTransition)
  
  
  console.log('Transaction was successfully signed and broadcasted, txhash: ', stateTransition.hash(true))
}
```


## Technical details


Extension works by keeping your wallet data in the browser storage, like your current wallet, stored identities and settings. 
All private keys are always encrypted before saving with password, that is asked every time your want to sign new transaction. 
There is no way to recover the password.

When user visit a webpage, a small public interface (40kb) gets injected into the <head> at the document_start. It provides
developers with an API interface to request transaction signing, without needing to ask them to put it in the website itself.

When user visit websites, extension injects a little script, a simple messaging bridge that allow webpages to communicate with Extension.
It shares a public API allowing devs to connect their application and asking permission from user to share wallet data with. If user approves
the connection, it also injects a [Dash Platform SDK](https://github.com/pshenmic/dash-platform-sdk) in the `window.dashPlatformSDK` that let
devs use the functions to operate in blockchain network right away. Extension does not inject any SDK libraries on all websites by default,
only on specific ones that user gave permissions to.

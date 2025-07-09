# Dash Platform Extension


###### A browser extension that let users easily interact with Dash Platform DApps.
![Dash](https://img.shields.io/badge/dash-008DE4?style=for-the-badge&logo=dash&logoColor=white)
![Google Chrome](https://img.shields.io/badge/Google%20Chrome-4285F4?style=for-the-badge&logo=GoogleChrome&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)


![a](https://github.com/pshenmic/platform-explorer/actions/workflows/build.yml/badge.svg)

___

![title](public/img/screenshots/import-identity-flow.png)

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

When user have extension running, it injects a small javascript code in the <head> block of the html pages, that let 
website communicate with extension. When website wish to use Dash Platform features, it connects through .connect() method
that asks user permission to share some of your public data (list of identities, currentIdentity). After connection is
successful, extension also injects and SDK into `window.dashPlatformSDK` for developers to quickly use it. It is possible
to use extension with SDK separately, or even with other SDKs.

`window.dashPlatformExtension.signer`:

```typescript
export interface AppConnectInfo {
    identities: string[];
    currentIdentity: string | null;
}
export interface AbstractSigner {
    connect: () => Promise<AppConnectInfo>;
    signAndBroadcast: (stateTransition: StateTransitionWASM) => Promise<StateTransitionWASM>;
}
```


## Integration

The integration of SDK is quite simple, first you need to call .connect() method, and ensure permission to connect, and then
you make a transaction with SDK and pass it to .signAndBroadcast() function:


#### 1) Check for Dash Platform Extension installed

When user installed the extension, it injects small messaging layer in the `window.dashPlatformExtension`. Check if it exists, 
and if true that means you're safe to proceed to next steps


#### 2) Ask extension permission to connect

Call `window.dashPlatformExtension.signer.connect()` async function that asks extension permission to connect. When it's executed
first time for the user, it will open dialogue asking for permission to share some wallet information with the current website.
If access is granted, it successfully adds the website in whitelist of current account in the extension.

### 3) Prepare unsigned Transaction (State Transition)

After successful connection, extension injects [Dash Platform SDK](https://github.com/pshenmic/dash-platform-sdk) instance 
in the `window.dashPlatformSdk` that you can use to create a transaction. It may be anything, such like creating a document, 
or registering data contract. Use Dash Platform SDK to create a transaction, for example:

```typescript
  const {dashPlatformSDK} = window
    
  const {currentIdentity: identity} = await window.dashPlatformExtension.signer.connect()
  const dataContract = '9jf2T5mLuoEXN2r24w9Kd5MNtJUnoMoB7YtFQNRznem3'
  const documentTypeName = 'note'
  const data = {
    "message": "test",
  }

  const identityContractNonce = await dashPlatformSDK.identities.getIdentityContractNonce(identity, dataContract)
  const document = await dashPlatformSDK.documents.create(dataContract, 'note', data, identity, 1)
  const stateTransition = await sdk.documents.createStateTransition(document, BatchType.Create, identityContractNonce + 1n)
```
### 4) Ask extension to sign the transaction
Pass your unsigned transaction to  `window.dashPlatformExtension.signer.signAndBroadcast(stateTransitionWASM)` and the user
will be prompted with transaction approval dialogue. After user enter the password and signs the transaction, it gets
broadcasted in the network and return a signed state transition in response

## Example
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

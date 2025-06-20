# Dash Platform Extension


###### A browser extension that let users easily interact with Dash Platform DApps.

___

##### This package in very early stage of development, and only testnet network supported at the moment.

The following features are currently available:

Import Identity by private key:
![title](public/img/screenshots/import-identity-flow.png)

View and confirm transactions:
![title](public/img/screenshots/identity-actions.png)

## General

Dash Platform extension is browser extension that shares an instance of [Dash Platform SDK](https://github.com/pshenmic/dash-platform-sdk) to the webpages when this extension is installed in your browser.

It works by providing a Javascript interface in the window object that let developers request transaction signing without asking them from a private key or seed phrase on the website itself.

Currently, it works by storing a private key from the Identity in the extension's storage, but in the next versions it is going to be possible to hand off storage of private keys to the Mobile device for enhanced security or pay with QR code.

It is not necessary to import all of Identity's keys to start interacting with applications, usually you only need AUTHENTICATION public key to start submitting documents, while other of your keys can be stay safe.

Furthermore, if your key is leaked, it is always possible to revoke leaked key and recreate new one for your identity.


## Current features

* Import identity by private key (only one currently supported)
* Show basic info (balance, transactions)
* Javascript API for transaction signing window dialogue

## Install

Only manual installation is currently supported

Head over to the Releases section, download a build archive, unpack it, and go to your Chrome's extensions menu and click "Load unpacked" button.

## Developer API

When user installs the extension and visit the DApp website, it injects a Dash Platform SDK instance in the `window` object, that let developers start working with it straight right away.

For instance:
```js
export const handleSendMessageButton = async () => {
  const {dashPlatformSDK} = window

  // owner
  const identity = '8eTDkBhpQjHeqgbVeriwLeZr1tCa6yBGw76SckvD1cwc'
  const dataContract = '9jf2T5mLuoEXN2r24w9Kd5MNtJUnoMoB7YtFQNRznem3'
  const documentTypeName = 'note'
  const data = {
    "message": "test",
  }

  const identityContractNonce = await window.dashPlatformSDK.identities.getIdentityContractNonce(identity, dataContract)
  const document = await window.dashPlatformSDK.documents.create(dataContract, 'note', data, identity, identityContractNonce + 1n)
  const stateTransition = await dashPlatformSDK.stateTransitions.documentsBatch.create(document, identityContractNonce + 1n)

  await window.dashPlatformSDK.signer.signStateTransition(stateTransition)
  
  
  console.log('Transaction was successfully signed and broadcasted, txhash: ', stateTransition.hash(true))
}
```

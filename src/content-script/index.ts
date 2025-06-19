// This file only runs in the extension context (content-script)
import { ExtensionStorageAdapter } from './storage/extensionStorageAdapter'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateAPI } from './api/PrivateAPI'
import { PublicAPI } from './api/PublicAPI'
import runMigrations from './storage/runMigrations'

const extensionStorageAdapter = new ExtensionStorageAdapter()

// do migrations
runMigrations(extensionStorageAdapter).catch(console.error)

const sdk = new DashPlatformSDK({ network: 'mainnet' })

const privateAPI = new PrivateAPI(sdk, extensionStorageAdapter)
const publicAPI = new PublicAPI(sdk, extensionStorageAdapter)

privateAPI.init()
publicAPI.init()

function injectScript (src) {
  const s = document.createElement('script')
  s.src = chrome.runtime.getURL(src);
  (document.head || document.documentElement).append(s)
}

injectScript('injected.js')

console.log('content script loaded')

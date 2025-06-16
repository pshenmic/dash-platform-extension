// This file only runs in the extension context (content-script)

import {DashPlatformSDK} from "dash-platform-sdk";

const sdk = new DashPlatformSDK({network: 'mainnet'})

import {ExtensionStorageAdapter} from "./storage/extensionStorageAdapter";

import {PrivateAPI} from "./api/PrivateAPI";
import {PublicAPI} from "./api/PublicAPI";

const extensionStorageAdapter = new ExtensionStorageAdapter()

const privateAPI = new PrivateAPI(sdk, extensionStorageAdapter)
const publicAPI = new PublicAPI(sdk, extensionStorageAdapter)

privateAPI.init()
publicAPI.init()

function injectScript (src) {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL(src);
    (document.head || document.documentElement).append(s);
}

injectScript('injected.js')

console.log('content script loaded')

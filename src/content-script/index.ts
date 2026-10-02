// This file only runs in the extension context (content-script)
import { ExtensionStorageAdapter } from './storage/extensionStorageAdapter'
import { EventData } from '../types'
import { MessagingMethods } from '../types/enums/MessagingMethods'
import { generateRandomHex } from '../utils'
import { SCHEMA_VERSION } from '../constants'
import { ext } from '../platform'

const extensionStorageAdapter = new ExtensionStorageAdapter()

// The backend is asked again on this interval, in case the first request was
// lost while the service worker was starting. Storage is read again with it, so
// a missed change event cannot leave the page waiting forever either.
const BACKEND_WAKE_INTERVAL = 2 * 1000

const start = async (): Promise<void> => {
  const wasmSupport = checkWebAssembly()

  if (!wasmSupport) {
    throw new Error('WebAssembly not supported')
  }

  // Dynamic import to bypass automatic WebAssembly modules initialization.
  //
  // It must stay "eager": a lazy import() becomes a separate chunk that webpack
  // loads with a <script> tag, and a content script's <script> tags resolve
  // against the web page's origin (https://example.com/666.js), not the
  // extension's. Eager keeps the module inside content-script.js and still only
  // evaluates it here, after the WebAssembly check.
  // eslint-disable-next-line
  // @ts-ignore
  const { initApp } = await import(/* webpackMode: "eager" */ './initApp')

  await initApp()

  const message: EventData = {
    id: generateRandomHex(8),
    context: 'dash-platform-extension',
    type: 'event',
    method: 'content-script-ready',
    payload: {}
  }

  window.postMessage(message)
}

const checkWebAssembly = (): boolean => {
  try {
    // eslint-disable-next-line
    new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00))

    return true
  } catch (e) {
    return false
  }
}

// Any request makes the service worker create the offscreen document, which
// boots the backend and runs the migrations. The reply is not needed (it goes
// to extension pages, not to content scripts).
const wakeBackend = (): void => {
  const message: EventData = {
    id: generateRandomHex(8),
    context: 'dash-platform-extension',
    type: 'request',
    method: MessagingMethods.GET_STATUS,
    payload: {}
  }

  ext.runtime.sendMessage(message).catch(() => {
    // No receiver yet (worker still waking); the send starts it regardless
  })
}

// Storage migrations belong to the backend alone (see backend/bootstrap.ts).
// They used to run here as well, in every tab, at the same time as the
// backend's own run: the two interleaved, one of them saw a half-migrated
// schema_version, threw, and restored its storage backup over the other's
// work. So the content script only waits for the schema to be ready.
//
// There is no deadline on purpose. A migration can take as long as it takes,
// and giving up would leave this page without the extension until it is
// reloaded, while every other page kept working. Instead the page waits for
// the backend to write the version, and keeps nudging it awake in case the
// first request was lost.
const waitForSchema = async (): Promise<void> => {
  const isReady = async (): Promise<boolean> =>
    await extensionStorageAdapter.get('schema_version') === SCHEMA_VERSION

  if (await isReady()) {
    return
  }

  await new Promise<void>((resolve) => {
    // Listening before the first nudge, so a version written while the request
    // is in flight is not missed.
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, areaName: string): void => {
      if (areaName === 'local' && changes.schema_version?.newValue === SCHEMA_VERSION) {
        done()
      }
    }

    const nudge = setInterval(() => {
      wakeBackend()

      isReady().then(ready => {
        if (ready) {
          done()
        }
      }, () => {})
    }, BACKEND_WAKE_INTERVAL)

    const done = (): void => {
      clearInterval(nudge)
      chrome.storage.onChanged.removeListener(onChanged)
      resolve()
    }

    chrome.storage.onChanged.addListener(onChanged)

    wakeBackend()
  })
}

waitForSchema()
  .then(start)
  .then(() => console.log('Dash Platform Extension API loaded (content-script)'))
  .catch((e) => {
    if (e?.message === 'WebAssembly not supported') {
      return console.log('Could not load Dash Platform Extension API: WebAssembly not available on this page')
    }

    console.log('There was a problem while loading Dash Platform Extension API')
    console.error(e)
  })

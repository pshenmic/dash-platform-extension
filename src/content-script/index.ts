// This file only runs in the extension context (content-script)
import { ExtensionStorageAdapter } from './storage/extensionStorageAdapter'
import { EventData } from '../types'
import { MessagingMethods } from '../types/enums/MessagingMethods'
import { generateRandomHex, wait } from '../utils'
import { SCHEMA_VERSION } from '../constants'
import { ext } from '../platform'

const extensionStorageAdapter = new ExtensionStorageAdapter()

// How long to wait for the backend to finish migrating storage
const SCHEMA_READY_TIMEOUT = 30 * 1000
const SCHEMA_POLL_INTERVAL = 200

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
const waitForSchema = async (): Promise<void> => {
  const startedAt = Date.now()
  let woken = false

  for (;;) {
    const schemaVersion = await extensionStorageAdapter.get('schema_version')

    if (schemaVersion === SCHEMA_VERSION) {
      return
    }

    if (!woken) {
      wakeBackend()
      woken = true
    }

    if (Date.now() - startedAt > SCHEMA_READY_TIMEOUT) {
      throw new Error(`Extension storage is not ready: schema version is ${String(schemaVersion)}, expected ${SCHEMA_VERSION}`)
    }

    await wait(SCHEMA_POLL_INTERVAL)
  }
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

// This file only runs in the extension context (content-script)
import { ExtensionStorageAdapter } from './storage/extensionStorageAdapter'
import runMigrations from './storage/runMigrations'
import { EventData } from '../types'
import { generateRandomHex } from '../utils'

const extensionStorageAdapter = new ExtensionStorageAdapter()

const start = async (): Promise<void> => {
  const wasmSupport = checkWebAssembly()

  if (!wasmSupport) {
    throw new Error('WebAssembly not supported')
  }

  // Dynamic import to bypass automatic WebAssembly modules initialization
  // eslint-disable-next-line
  // @ts-ignore
  const { initApp } = await import('./initApp')

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

// do migrations
runMigrations(extensionStorageAdapter)
  .then(start)
  .then(() => console.log('Dash Platform Extension API loaded (content-script)'))
  .catch((e) => {
    if (e?.message === 'WebAssembly not supported') {
      return console.log('Could not load Dash Platform Extension API: WebAssembly not available on this page')
    }

    console.log('There was a problem while loading Dash Platform Extension API')
    console.error(e)
  })

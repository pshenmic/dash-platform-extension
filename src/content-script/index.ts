// This file only runs in the extension context (content-script)
import { ExtensionStorageAdapter } from './storage/extensionStorageAdapter'
import runMigrations from './storage/runMigrations'
import {checkWebAssembly} from "../utils";
const extensionStorageAdapter = new ExtensionStorageAdapter()

// do migrations
runMigrations(extensionStorageAdapter)
  .catch(console.error)

const start = async (): Promise<void> => {
  const wasmSupport = checkWebAssembly()

  if (!wasmSupport) {
    throw new Error('WebAssembly not supported')
  }

  // Dynamic import to bypass automatic WebAssembly modules initialization
  // @ts-expect-error
  const { initApp } = await import('./initApp')

  await initApp()
}

start()
  .then(() => console.log('Dash Platform Extension API loaded (content-script)'))
  .catch((e) => {
    if (e?.message === 'WebAssembly not supported') {
      return console.log('Could not load Dash Platform Extension API: WebAssembly not available on this page')
    }

    console.log('There was a problem while loading Dash Platform Extension API')
    console.error(e)
  })

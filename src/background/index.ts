import { ext } from '../platform'
import { EventData } from '../types'
import { ExtensionStorageAdapter } from '../content-script/storage/extensionStorageAdapter'
import { STORAGE_MESSAGE, StorageRequest, StorageResponse } from '../backend/storageMessages'

/**
 * Chrome MV3 service worker.
 *
 * Two jobs, neither of which touches the SDK:
 *
 *  1. Make sure the offscreen document that hosts the backend exists, and hand
 *     wallet requests to it. Replies do not come back through here — the
 *     offscreen document answers the popup directly (see attachMessaging).
 *  2. Perform storage on the offscreen document's behalf. Chrome exposes only
 *     the `chrome.runtime` messaging APIs to offscreen documents, so they
 *     cannot reach `chrome.storage` themselves.
 */

const OFFSCREEN_PATH = 'offscreen.html'

const storage = new ExtensionStorageAdapter()

let creating: Promise<void> | null = null

async function ensureOffscreen (): Promise<void> {
  if (await chrome.offscreen.hasDocument()) {
    return
  }

  // createDocument throws if called twice concurrently, so in-flight creations
  // share one promise.
  if (creating == null) {
    creating = chrome.offscreen.createDocument({
      url: OFFSCREEN_PATH,
      reasons: [chrome.offscreen.Reason.WORKERS],
      justification: 'Dash Platform SDK runs WebAssembly that requires a DOM and worker threads'
    }).finally(() => { creating = null })
  }

  await creating
}

async function handleStorage (request: StorageRequest): Promise<any> {
  switch (request.op) {
    case 'getAll':
      return await storage.getAll()
    case 'get':
      return await storage.get(request.key as string)
    case 'set':
      return await storage.set(request.key as string, request.value as any)
    case 'remove':
      return await storage.remove(request.key as string)
    default:
      throw new Error(`Unknown storage op ${String(request.op)}`)
  }
}

ext.runtime.onMessage.addListener((data: any, sender, sendResponse) => {
  if (data?.context !== 'dash-platform-extension') return

  // Storage proxy. Answered with sendResponse because these are short — unlike
  // wallet calls, which can run for minutes and must not depend on this worker
  // still being alive when they finish.
  if (data.type === STORAGE_MESSAGE) {
    handleStorage(data as StorageRequest)
      .then((result: any) => sendResponse({ ok: true, result } satisfies StorageResponse))
      .catch(e => sendResponse({ ok: false, error: e.message } satisfies StorageResponse))

    return true
  }

  const event = data as EventData

  // Responses flow popup <- offscreen directly; ignore them here.
  if (event.type === 'response') return
  // Our own forwarded copy comes back around on the shared bus — don't re-forward.
  if (event.target === 'offscreen') return

  ensureOffscreen()
    .then(async () => await ext.runtime.sendMessage({ ...event, target: 'offscreen' }))
    .catch(e => console.error('Failed to route request to offscreen backend', e))
})

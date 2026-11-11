import { ext } from '../platform'
import { EventData } from '../types'
import { ExtensionStorageAdapter } from '../content-script/storage/extensionStorageAdapter'
import { STORAGE_MESSAGE, StorageRequest, StorageResponse } from '../backend/storageMessages'

/**
 * Chrome MV3 service worker.
 *
 * Three jobs, none of which touches the SDK:
 *
 *  1. Make sure the offscreen document that hosts the backend exists, and hand
 *     wallet requests to it. Replies do not come back through here — the
 *     offscreen document answers the popup directly (see attachMessaging).
 *  2. Perform storage on the offscreen document's behalf. Chrome exposes only
 *     the `chrome.runtime` messaging APIs to offscreen documents, so they
 *     cannot reach `chrome.storage` themselves.
 *  3. Carry the backend's answer to a content-script call back to it.
 *     `runtime.sendMessage` does not reach content scripts, so the offscreen
 *     document's broadcast reply is matched to the request that opened it and
 *     delivered over that request's own response channel.
 */

const OFFSCREEN_PATH = 'offscreen.html'

const storage = new ExtensionStorageAdapter()

// Request id -> the response channel of the content script waiting on it. A
// codec call is a decode, so an entry whose reply never lands is dropped
// rather than held for the worker's lifetime.
const pendingBackendCalls = new Map<string, (response: EventData) => void>()
const CALL_REPLY_TIMEOUT = 60 * 1000

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

const failBackendCall = (event: EventData, message: string): void => {
  const respond = pendingBackendCalls.get(event.id)

  if (respond == null) {
    return
  }

  pendingBackendCalls.delete(event.id)

  respond({
    id: event.id,
    context: event.context,
    type: 'response',
    method: event.method,
    payload: null,
    error: message
  })
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

  if (event.type === 'response') {
    // Popup replies flow popup <- offscreen directly. Only a content script
    // call is waiting on this worker to hand its answer back.
    const respond = pendingBackendCalls.get(event.id)

    if (respond != null) {
      pendingBackendCalls.delete(event.id)
      respond(event)
    }

    return
  }

  // Our own forwarded copy comes back around on the shared bus — don't re-forward.
  if (event.target === 'offscreen') return

  // A decode the content script asked the backend for. The reply is matched by
  // id when the offscreen document broadcasts it.
  if (event.target === 'codec') {
    pendingBackendCalls.set(event.id, sendResponse)
    setTimeout(() => pendingBackendCalls.delete(event.id), CALL_REPLY_TIMEOUT)

    ensureOffscreen()
      .then(async () => await ext.runtime.sendMessage({ ...event, target: 'offscreen' }))
      .catch(e => {
        console.error('Failed to hand content-script call to offscreen backend', e)
        failBackendCall(event, e.message)
      })

    return true
  }

  ensureOffscreen()
    .then(async () => await ext.runtime.sendMessage({ ...event, target: 'offscreen' }))
    .catch(e => console.error('Failed to route request to offscreen backend', e))
})

// Pre-warm the backend when the browser starts (or the extension is installed or
// updated), so the WASM compile happens before the user clicks rather than on
// the click. The offscreen document shares a renderer process — and therefore a
// main thread — with the popup, so a compile that coincides with opening the
// popup blocks the popup's first paint.
chrome.runtime.onStartup.addListener(() => {
  ensureOffscreen().catch(e => console.error('Failed to pre-warm offscreen backend', e))
})
chrome.runtime.onInstalled.addListener(() => {
  ensureOffscreen().catch(e => console.error('Failed to pre-warm offscreen backend', e))
})

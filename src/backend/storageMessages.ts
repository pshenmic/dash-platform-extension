/**
 * Storage proxy protocol between the offscreen document and the service worker.
 *
 * Chrome deliberately exposes only the `chrome.runtime` messaging APIs to an
 * offscreen document — `chrome.storage` is NOT available there — so the
 * document cannot touch storage directly and asks the worker to do it instead.
 * Kept on its own message `type` so it never collides with the wallet RPC.
 */

export const STORAGE_MESSAGE = 'storage'

export type StorageOp = 'getAll' | 'get' | 'set' | 'remove'

export interface StorageRequest {
  context: 'dash-platform-extension'
  type: typeof STORAGE_MESSAGE
  op: StorageOp
  key?: string
  value?: object | number | string | null
}

export interface StorageResponse {
  ok: boolean
  result?: any
  error?: string
}

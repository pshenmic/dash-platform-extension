import { ExtensionStorageAdapter } from './storage/extensionStorageAdapter'
import { PublicAPI } from './api/PublicAPI'
import { EventData } from '../types/EventData'
import { MessagingMethods } from '../types/enums/MessagingMethods'
import { generateRandomHex } from '../utils/random'
import { injectScript } from '../utils/browser'
import { ext } from '../platform'
import type { StateTransitionInspection } from '../types/StateTransitionInspection'

/**
 * Content script bootstrap.
 *
 * Nothing here may import the SDK, directly or transitively: pshenmic-dpp
 * allocates a `shared: true` WebAssembly.Memory while its module is evaluated,
 * and that needs `crossOriginIsolated`. A content script shares the website's
 * document, so it never has it, and the allocation throws.
 *
 * The public API still owns all of its business logic. The only thing it asks
 * the offscreen backend for is a decode: a serialized transition in, its owner
 * and unsigned hash out.
 */
export async function initApp (): Promise<void> {
  const extensionStorageAdapter = new ExtensionStorageAdapter()

  // The offscreen document broadcasts its reply with runtime.sendMessage,
  // which does not reach content scripts, so the service worker matches it by
  // id and answers over this same channel (see background/index.ts).
  const inspectStateTransition = async (encoded: string): Promise<StateTransitionInspection> => {
    const message: EventData = {
      id: generateRandomHex(8),
      context: 'dash-platform-extension',
      type: 'request',
      method: MessagingMethods.INSPECT_STATE_TRANSITION,
      payload: { base64: encoded },
      target: 'codec'
    }

    const reply = await ext.runtime.sendMessage(message)

    if (reply == null) {
      throw new Error('Backend did not answer the request')
    }

    if (reply.error != null) {
      throw new Error(reply.error)
    }

    return reply.payload
  }

  const publicAPI = new PublicAPI(extensionStorageAdapter, inspectStateTransition)

  publicAPI.listen()

  injectScript(document, 'injectExtension.js')
}

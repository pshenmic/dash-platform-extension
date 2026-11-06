import { ExtensionStorageAdapter } from './storage/extensionStorageAdapter'
import { PublicAPI } from './api/PublicAPI'
import { EventData } from '../types/EventData'
import { injectScript } from '../utils/browser'
import { ext } from '../platform'

/**
 * Content script bootstrap.
 *
 * Nothing here may import the SDK, directly or transitively: pshenmic-dpp
 * allocates a `shared: true` WebAssembly.Memory while its module is evaluated,
 * and that needs `crossOriginIsolated`. A content script shares the website's
 * document, so it never has it, and the allocation throws. Page requests that
 * need the SDK are relayed to the offscreen backend instead.
 */
export async function initApp (): Promise<void> {
  const extensionStorageAdapter = new ExtensionStorageAdapter()

  const publicAPI = new PublicAPI(extensionStorageAdapter)

  // Hands a page request to the offscreen backend and waits for the reply. The
  // service worker forwards it on and answers over this same channel, because
  // the offscreen document broadcasts with runtime.sendMessage, which does not
  // reach content scripts.
  const relayToBackend = async (data: EventData, origin: string): Promise<any> => {
    const reply = await ext.runtime.sendMessage({ ...data, target: 'public-api', origin })

    if (reply == null) {
      throw new Error('Backend did not answer the request')
    }

    if (reply.error != null) {
      throw new Error(reply.error)
    }

    return reply.payload
  }

  publicAPI.listen(relayToBackend)

  injectScript(document, 'injectExtension.js')
}

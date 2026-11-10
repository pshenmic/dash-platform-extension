import { ext } from '../platform'
import { EventData } from '../types'
import { MessagingMethods } from '../types/enums/MessagingMethods'
import { BroadcastError } from '../content-script/errors/BroadcastError'
import type { PrivateAPI } from '../content-script/api/PrivateAPI'
import { inspectStateTransition } from './codec'

/**
 * Wires a booted backend up to extension messaging.
 *
 * Takes the promise rather than the instance so that requests arriving while
 * the backend is still booting queue on it instead of hitting "receiving end
 * does not exist" — the listener is registered synchronously by the caller.
 *
 * Serves two kinds of request: wallet calls from extension pages, and the
 * decode primitive a content script needs for the public layer. The primitive
 * is stateless, so it is answered without waiting for the wallet to boot.
 */
export function attachMessaging (backend: Promise<PrivateAPI>): void {
  const respond = (request: EventData, payload: any, error: string | null): void => {
    const message: EventData = {
      id: request.id,
      context: 'dash-platform-extension',
      type: 'response',
      method: request.method,
      payload,
      error
    }

    // Replies go straight to the popup rather than back through the service
    // worker. Shielded proving can run for 20 minutes against a worker that
    // idles out in 30 seconds, so keeping the worker off the response path
    // means a long operation cannot lose its reply to a terminated worker.
    //
    // A codec reply is the exception: runtime.sendMessage does not reach
    // content scripts, so the worker delivers it to the tab that asked (see
    // background/index.ts).
    ext.runtime.sendMessage(message).catch(() => {
      // The popup closed before the reply landed — nothing to deliver to.
    })
  }

  const onMessage = (data: EventData): void => {
    if (data?.context !== 'dash-platform-extension' || data.type === 'response') {
      return
    }

    // Only act on the copy the service worker forwarded. sendMessage reaches
    // every extension context, so the popup's original request lands here too
    // — handling both would run every operation twice.
    if (data.target !== 'offscreen') {
      return
    }

    if (data.method === MessagingMethods.INSPECT_STATE_TRANSITION) {
      try {
        respond(data, inspectStateTransition(data.payload.base64), null)
      } catch (e) {
        respond(data, null, e.message)
      }

      return
    }

    backend
      .then(async (privateAPI) => await privateAPI.handleMessage(data))
      .then(result => respond(data, result, null))
      .catch(e => respond(
        data,
        e instanceof BroadcastError ? { signedHex: e.signedHex } : null,
        e.message
      ))
  }

  ext.runtime.onMessage.addListener(onMessage)
}

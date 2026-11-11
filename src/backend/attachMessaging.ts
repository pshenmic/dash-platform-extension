import { ext } from '../platform'
import { EventData } from '../types'
import { MessagingMethods } from '../types/enums/MessagingMethods'
import { BroadcastError } from '../content-script/errors/BroadcastError'
import { MessageDispatcher } from '../content-script/api/MessageDispatcher'
import type { PrivateAPI } from '../content-script/api/PrivateAPI'
import { InspectStateTransitionHandler } from './inspectStateTransition'

/**
 * Wires a booted backend up to extension messaging.
 *
 * Takes the promise rather than the instance so that requests arriving while
 * the backend is still booting queue on it instead of hitting "receiving end
 * does not exist" — the listener is registered synchronously by the caller.
 *
 * Two handler tables share the transport. `internalHandlers` are calls the
 * content script needs from an extension page — today only the transition
 * decode that keeps the public layer SDK-free — and answer without the wallet.
 * Everything else is a wallet call from an extension page, served by PrivateAPI.
 */
export function attachMessaging (backend: Promise<PrivateAPI>): void {
  const internalAPI = new MessageDispatcher({
    [MessagingMethods.INSPECT_STATE_TRANSITION]: new InspectStateTransitionHandler()
  })

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

    const dispatch = internalAPI.owns(data.method)
      ? internalAPI.handleMessage(data)
      : backend.then(async (privateAPI) => await privateAPI.handleMessage(data))

    dispatch
      .then(result => respond(data, result, null))
      .catch(e => respond(
        data,
        e instanceof BroadcastError ? { signedHex: e.signedHex } : null,
        e.message
      ))
  }

  ext.runtime.onMessage.addListener(onMessage)
}

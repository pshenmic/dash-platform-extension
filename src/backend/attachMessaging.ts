import { ext } from '../platform'
import { EventData } from '../types'
import { BroadcastError } from '../content-script/errors/BroadcastError'
import type { Backend } from './bootstrap'

/**
 * Wires a booted backend up to extension messaging.
 *
 * Takes the promise rather than the instance so that requests arriving while
 * the backend is still booting queue on it instead of hitting "receiving end
 * does not exist" — the listener is registered synchronously by the caller.
 *
 * Serves both kinds of request: wallet calls from extension pages, and page
 * calls a content script relayed here because they need the SDK. The two are
 * told apart by the handler table, not by the sender, and a relayed page call
 * carries the origin its content script observed.
 */
export function attachMessaging (backend: Promise<Backend>): void {
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
    // A relayed page call is the exception: runtime.sendMessage does not reach
    // content scripts, so the worker picks this up and delivers it to the tab
    // that asked (see background/index.ts).
    ext.runtime.sendMessage(message).catch(() => {
      // The popup closed before the reply landed — nothing to deliver to.
    })
  }

  const dispatch = async ({ privateAPI, publicAPI }: Backend, data: EventData): Promise<any> => {
    if (!publicAPI.owns(data.method)) {
      return await privateAPI.handleMessage(data)
    }

    // Only a content script sets this, so a page cannot name its own origin.
    if (typeof data.origin !== 'string' || data.origin === '') {
      throw new Error('Relayed page request is missing its origin')
    }

    return await publicAPI.handleMessage(data, data.origin)
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

    backend
      .then(async (booted) => await dispatch(booted, data))
      .then(result => respond(data, result, null))
      .catch(e => respond(
        data,
        e instanceof BroadcastError ? { signedHex: e.signedHex } : null,
        e.message
      ))
  }

  ext.runtime.onMessage.addListener(onMessage)
}

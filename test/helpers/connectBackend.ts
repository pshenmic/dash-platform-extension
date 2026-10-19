import { attachMessaging } from '../../src/backend/attachMessaging'
import { ext } from '../../src/platform'
import { EventData } from '../../src/types'
import type { PrivateAPI } from '../../src/content-script/api/PrivateAPI'

/**
 * Boots a PrivateAPI onto the real messaging transport for tests, standing in
 * for the two production contexts: the offscreen document (attachMessaging)
 * and the service worker that tags requests for it.
 */
// Listeners the previous call left on the shared message bus. A suite wires a
// fresh backend in every beforeEach, and without dropping these the old ones
// keep answering: whichever replies first wins, so a test can be answered by the
// backend of the test before it.
let wired: Array<(data: EventData) => void> = []

export function connectBackend (privateAPI: PrivateAPI): void {
  for (const listener of wired) {
    ext.runtime.onMessage.removeListener(listener)
  }

  wired = []

  privateAPI.buildHandlers()

  wired.push(attachMessaging(Promise.resolve(privateAPI)))

  // Service-worker stand-in. The real one also creates the offscreen document;
  // here only the routing tag matters.
  const forward = (data: EventData): void => {
    if (data?.context !== 'dash-platform-extension') return
    if (data.type === 'response' || data.target === 'offscreen') return

    void ext.runtime.sendMessage({ ...data, target: 'offscreen' })
  }

  ext.runtime.onMessage.addListener(forward)
  wired.push(forward)
}

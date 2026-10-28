import { attachMessaging } from '../../src/backend/attachMessaging'
import { ext } from '../../src/platform'
import { EventData } from '../../src/types'
import type { PrivateAPI } from '../../src/content-script/api/PrivateAPI'

/**
 * Boots a PrivateAPI onto the real messaging transport for tests, standing in
 * for the two production contexts: the offscreen document (attachMessaging)
 * and the service worker that tags requests for it.
 */
export function connectBackend (privateAPI: PrivateAPI): void {
  // A suite wires a fresh backend per case onto the bus the whole file shares.
  // Without this the previous backends keep listening and answer out of their
  // own storage. removeAllListeners belongs to the test bus alone, which is why
  // it is not on the extension's own type.
  const bus = ext.runtime.onMessage as unknown as { removeAllListeners: () => void }

  bus.removeAllListeners()

  privateAPI.buildHandlers()

  attachMessaging(Promise.resolve(privateAPI))

  // Service-worker stand-in. The real one also creates the offscreen document;
  // here only the routing tag matters.
  const forward = (data: EventData): void => {
    if (data?.context !== 'dash-platform-extension' || data.type === 'response' || data.target === 'offscreen') {
      return
    }

    void ext.runtime.sendMessage({ ...data, target: 'offscreen' })
  }

  ext.runtime.onMessage.addListener(forward)
}

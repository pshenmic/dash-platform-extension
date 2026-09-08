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
  privateAPI.buildHandlers()

  attachMessaging(Promise.resolve(privateAPI))

  // Service-worker stand-in. The real one also creates the offscreen document;
  // here only the routing tag matters.
  ext.runtime.onMessage.addListener((data: EventData) => {
    if (data?.context !== 'dash-platform-extension') return
    if (data.type === 'response' || data.target === 'offscreen') return

    void ext.runtime.sendMessage({ ...data, target: 'offscreen' })
  })
}

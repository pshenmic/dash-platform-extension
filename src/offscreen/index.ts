import { startBackend } from '../backend/bootstrap'
import { attachMessaging } from '../backend/attachMessaging'

/**
 * Chrome's backend host.
 *
 * An MV3 service worker has no DOM, and pshenmic-dpp treats a missing
 * `self.document` as "I am a pthread child" and exports null — so the SDK
 * cannot load there at all. An offscreen document is an ordinary extension
 * page (same CSP, same capabilities as the popup) that outlives the popup,
 * which is what keeps the compiled WASM warm between opens.
 */

// Start booting immediately; attachMessaging registers its listener
// synchronously so requests arriving mid-boot queue on this promise.
const backend = startBackend()

attachMessaging(backend)

backend
  .then(() => console.log('Dash Platform Extension backend ready (offscreen)'))
  .catch(e => console.error('Failed to start backend', e))

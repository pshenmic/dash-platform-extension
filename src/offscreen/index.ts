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

// The backend (and with it the SDK) is imported dynamically on purpose.
// Importing it statically would compile the WASM while this module's imports
// are evaluated, before the listener below exists; a request arriving in that
// window (about a second on a cold browser start) would be dropped, leaving the
// popup on its spinner until MESSAGING_TIMEOUT. This way the listener is live
// as soon as the document runs, and early requests queue on `backend`.
const backend = import('../backend/bootstrap')
  .then(async ({ startBackend }) => await startBackend())

attachMessaging(backend)

backend
  .then(() => console.log('Dash Platform Extension backend ready (offscreen)'))
  .catch(e => console.error('Failed to start backend', e))

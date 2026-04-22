import type { DashPlatformSDK } from 'dash-platform-sdk'
import { StateTransitionWASM } from 'dash-platform-sdk/types'
import { wait } from '../../utils'
import { MAX_BROADCAST_RETRIES, BROADCAST_RETRY_DELAY_MS } from '../../constants'

/**
 * Broadcasts a state transition with retry on core chain height race condition.
 *
 * Chain lock proofs can arrive 1 block ahead of the platform's consensus height.
 * In that case the platform returns a 'core chain height' error — retrying after
 * a short delay resolves it once the platform catches up.
 */
export const broadcastStateTransitionWithRetry = async (
  sdk: DashPlatformSDK,
  stateTransition: StateTransitionWASM
): Promise<void> => {
  for (let attempt = 0; ; attempt++) {
    try {
      await sdk.stateTransitions.broadcast(stateTransition)
      return
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (attempt < MAX_BROADCAST_RETRIES && msg.includes('core chain height')) {
        await wait(BROADCAST_RETRY_DELAY_MS)
      } else {
        throw e
      }
    }
  }
}

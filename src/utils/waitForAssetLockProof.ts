import {
  DashCoreSDK,
  InstantLock,
  Transaction,
  utils
} from 'dash-core-sdk'
import type { InstantAssetLockProofParams, ChainAssetLockProofParams } from 'dash-core-sdk/src/utils.js'
import type { DashPlatformSDK } from 'dash-platform-sdk'
import type { AssetLockProof } from '../types/AssetLockProof'
import { wait } from './index'
import {
  LOCK_POLL_INTERVAL_MS,
  LOCK_TIMEOUT_MS
} from '../constants'

/**
 * Waits for the asset lock transaction to receive either an instant lock or a chain lock,
 * whichever comes first. Returns the appropriate proof params for use with
 * sdk.identities.createStateTransition('create', { assetLockProof }).
 *
 * - Instant lock: arrives within seconds on a healthy network (mainnet / testnet).
 * - Chain lock: fallback after 2-4 minutes if instant lock is not received.
 *
 * Both races run concurrently; the first to resolve wins and the other is abandoned.
 */
export const waitForAssetLockProof = async (
  coreSDK: DashCoreSDK,
  platformSDK: DashPlatformSDK,
  assetLockTx: Transaction,
  txid: string,
  subscription: ReturnType<DashCoreSDK['subscribeToTransactions']>,
  pollIntervalMs: number = LOCK_POLL_INTERVAL_MS,
  timeoutMs: number = LOCK_TIMEOUT_MS
): Promise<AssetLockProof> => {
  let settled = false

  // Race 1: instant lock via subscription
  const instantLockRace = async (): Promise<AssetLockProof> => {
    for await (const event of subscription) {
      if (settled) return await Promise.reject(new Error('cancelled'))

      if (event.event !== 'instantSendLockMessage') continue

      let instantLock: InstantLock
      try {
        instantLock = InstantLock.fromHex(event.data)
      } catch {
        continue
      }

      if (instantLock.txId !== txid) continue

      return utils.createAssetLockProof({ transaction: assetLockTx, instantLock, outputIndex: 0 }) as InstantAssetLockProofParams
    }

    return await Promise.reject(new Error('Instant lock subscription ended without result'))
  }

  // Race 2: chain lock via polling
  // RPC polling is used instead of an event subscription because chain lock
  // events may be missed (late subscription, dropped connection, evonode that
  // never emitted the event for this tx). Polling getTransaction guarantees
  // the tx is checked on every tick and will eventually resolve once any
  // evonode reports isChainLocked, even if no event is ever delivered.
  const chainLockRace = async (): Promise<AssetLockProof> => {
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
      if (settled) return await Promise.reject(new Error('cancelled'))

      try {
        const dapiTx = await coreSDK.getTransaction(txid)

        if (dapiTx.isChainLocked) {
          const requiredPlatformHeight = dapiTx.height

          while (Date.now() < deadline) {
            if (settled) return await Promise.reject(new Error('cancelled'))

            try {
              const nodeStatus = await platformSDK.node.status()
              const latestPlatformHeight = nodeStatus.chain?.coreChainLockedHeight ?? 0

              if (
                Number.isSafeInteger(latestPlatformHeight) &&
                latestPlatformHeight >= requiredPlatformHeight
              ) {
                return utils.createAssetLockProof({ transaction: assetLockTx, coreChainLockedHeight: dapiTx.height, outputIndex: 0 }) as ChainAssetLockProofParams
              }
            } catch (e) {
              console.warn('Failed to fetch Platform node status while waiting for asset lock proof', e)
            }

            await wait(pollIntervalMs)
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch asset lock transaction ${txid} while waiting for proof`, e)
      }

      await wait(pollIntervalMs)
    }

    return await Promise.reject(new Error(
      `Timed out waiting for asset lock proof on transaction ${txid}. ` +
      `Elapsed: ${timeoutMs / 1000}s. The transaction may still be confirmed - ` +
      'try resuming registration once the network has processed the block.'
    ))
  }

  const result = await Promise.race([
    instantLockRace(),
    chainLockRace()
  ])

  settled = true
  return result
}

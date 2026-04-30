import {
  DashCoreSDK,
  ExtraPayload,
  Input,
  InstantLock,
  Output,
  PrivateKey,
  Script,
  Transaction,
  TransactionType,
  utils
} from 'dash-core-sdk'
import type { InstantAssetLockProofParams, ChainAssetLockProofParams } from 'dash-core-sdk/src/utils.js'
import type { BuildAssetLockFromFundingTxOptions, AssetLockBuildResult, AssetLockProof } from '../types/AssetLock'
import type { DashPlatformSDK } from 'dash-platform-sdk'
import { wait } from './index'
import {
  MIN_FEE_RELAY,
  LOCK_POLL_INTERVAL_MS,
  LOCK_TIMEOUT_MS,
  MIN_ASSET_LOCK_FUNDING_TX_CONFIRMATIONS
} from '../constants'

/**
 * Builds an asset lock transaction from an asset lock funding transaction.
 *
 * Steps:
 *  1. Fetch and verify the funding tx (hash must match txid)
 *  2. Confirm it's locked (instant/chain) or confirmed (≥1 confirmation)
 *  3. Find the output paying to the asset lock funding address (by outputIndex or scan)
 *  4. Build asset lock tx: input + credit output both bound to the funding address
 *
 * The funding key is single-use per DIP-0011: it signs the input, owns the
 * credit output, and later signs the IdentityCreateTransition.
 */
export const buildAssetLockFromFundingTx = async (
  options: BuildAssetLockFromFundingTxOptions
): Promise<AssetLockBuildResult> => {
  const {
    coreSDK,
    assetLockFundingTxid,
    assetLockFundingAddress,
    assetLockFundingPrivateKeyWif,
    outputIndex
  } = options

  const dapiTx = await coreSDK.getTransaction(assetLockFundingTxid).catch((e: unknown) => {
    throw new Error(`Could not load asset lock funding transaction ${assetLockFundingTxid}: ${e instanceof Error ? e.message : String(e)}`)
  })

  const fundingTx = Transaction.fromBytes(Uint8Array.from(dapiTx.transaction))
  if (fundingTx.hash() !== assetLockFundingTxid) {
    throw new Error(`Transaction hash mismatch for ${assetLockFundingTxid}: transaction data is corrupt`)
  }

  if (!dapiTx.isInstantLocked && !dapiTx.isChainLocked && dapiTx.confirmations < MIN_ASSET_LOCK_FUNDING_TX_CONFIRMATIONS) {
    throw new Error(
      `Asset lock funding transaction ${assetLockFundingTxid} is not locked or confirmed yet. ` +
      'Please wait for an instant lock or at least one confirmation before proceeding.'
    )
  }

  // Locate the output that pays to the asset lock funding address.
  // If outputIndex is provided, use it; otherwise scan outputs for the one
  // whose P2PKH script matches assetLockFundingAddress.
  let resolvedOutputIndex: number
  if (outputIndex != null) {
    resolvedOutputIndex = outputIndex
  } else {
    const expectedScriptHex = Output.createP2PKH(0n, assetLockFundingAddress).script.hex()
    resolvedOutputIndex = fundingTx.outputs.findIndex(
      o => o.script.hex() === expectedScriptHex
    )
    if (resolvedOutputIndex === -1) {
      throw new Error(
        `Could not find output paying to ${assetLockFundingAddress} in transaction ${assetLockFundingTxid}`
      )
    }
  }

  if (resolvedOutputIndex >= fundingTx.outputs.length) {
    throw new Error(
      `outputIndex ${resolvedOutputIndex} is out of range (transaction has ${fundingTx.outputs.length} outputs)`
    )
  }

  const fundingOutput = fundingTx.outputs[resolvedOutputIndex]

  const assetLockFundingPrivateKey = PrivateKey.fromWIF(assetLockFundingPrivateKeyWif)
  const lockingScript = Output.createP2PKH(0n, assetLockFundingPrivateKey.getAddress()).script
  const lockedAmount = fundingOutput.satoshis - MIN_FEE_RELAY

  if (lockedAmount <= 0n) {
    throw new Error(
      `Asset lock funding output at index ${resolvedOutputIndex} (${fundingOutput.satoshis} duffs) ` +
      `is too small to cover the transaction fee (${MIN_FEE_RELAY} duffs)`
    )
  }

  const creditOutput = Output.createP2PKH(lockedAmount, assetLockFundingAddress)
  const assetLockTx = new Transaction(
    [],
    [new Output(lockedAmount, Script.fromASM('OP_RETURN OP_0'))],
    undefined,
    undefined,
    TransactionType.TRANSACTION_ASSET_LOCK,
    new ExtraPayload.AssetLockTx(1, 1, [creditOutput])
  )
  assetLockTx.addInput(new Input(assetLockFundingTxid, resolvedOutputIndex, lockingScript, 0))
  assetLockTx.sign(assetLockFundingPrivateKey)

  return {
    assetLockTx,
    assetLockOutputIndex: 0 // single credit output → always index 0 in the asset lock payload
  }
}

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

  // ── Race 1: instant lock via subscription ────────────────────────────────
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

  // ── Race 2: chain lock via polling ───────────────────────────────────────
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
            } catch {
              // Transient DAPI error — keep polling
            }

            await wait(pollIntervalMs)
          }
        }
      } catch {
        // Transient DAPI error — keep polling
      }

      await wait(pollIntervalMs)
    }

    return await Promise.reject(new Error(
      `Timed out waiting for asset lock proof on transaction ${txid}. ` +
      `Elapsed: ${timeoutMs / 1000}s. The transaction may still be confirmed — ` +
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

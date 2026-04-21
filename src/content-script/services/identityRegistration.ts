import {
  DashCoreSDK,
  ExtraPayload,
  Input,
  InstantLock,
  Output,
  PrivateKey,
  Script,
  Transaction,
  TransactionType
} from 'dash-core-sdk'
import type { InstantAssetLockProofParams, ChainAssetLockProofParams } from 'dash-core-sdk'
import type { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'dash-platform-sdk/types'
import hash from 'hash.js'
import { decrypt } from 'eciesjs'
import { hexToBytes, wait } from '../../utils'
import {
  FEE_PER_BYTE,
  MIN_FEE_RELAY,
  LOCK_POLL_INTERVAL_MS,
  LOCK_TIMEOUT_MS,
  MIN_PAYMENT_TX_CONFIRMATIONS
} from '../../constants'

/**
 * Decrypts the one-time address private key stored in OneTimeAddressesRepository.
 * Uses the same scheme as deriveKeystorePrivateKey: sha256(password) as the decryption key.
 */
export const decryptOneTimePrivateKey = (
  encryptedPrivateKey: string,
  password: string,
  network: string
): PrivateKeyWASM => {
  const passwordHash = hash.sha256().update(password).digest('hex')

  let privateKeyBytes: Uint8Array

  try {
    privateKeyBytes = decrypt(passwordHash, hexToBytes(encryptedPrivateKey))
  } catch {
    throw new Error('Failed to decrypt one-time private key: incorrect password or corrupted key')
  }

  return PrivateKeyWASM.fromBytes(privateKeyBytes, network)
}

// ── Payment tx → asset lock ───────────────────────────────────────────────────

export interface BuildAssetLockFromPaymentOptions {
  coreSDK: DashCoreSDK
  network: string
  paymentTxid: string
  oneTimeAddress: string
  oneTimePrivateKeyWif: string
  outputIndex?: number
}

export interface AssetLockBuildResult {
  assetLockTx: Transaction
  assetLockOutputIndex: number
}

/**
 * Builds an asset lock transaction from a payment transaction.
 *
 * Steps:
 *  1. Fetch and verify the payment tx (hash must match txid)
 *  2. Confirm it's locked (instant/chain) or confirmed (≥1 confirmation)
 *  3. Find the output paying to the one-time address (by outputIndex or index 0)
 *  4. Build asset lock tx via DashCoreSDK.createAssetLockTransaction (Core primitive)
 */
export const buildAssetLockFromPaymentTx = async (
  options: BuildAssetLockFromPaymentOptions
): Promise<AssetLockBuildResult> => {
  const { coreSDK, paymentTxid, oneTimeAddress, oneTimePrivateKeyWif, outputIndex } = options

  // Load the payment transaction from DAPI
  let dapiTx: Awaited<ReturnType<DashCoreSDK['getTransaction']>>

  try {
    dapiTx = await coreSDK.getTransaction(paymentTxid)
  } catch (e) {
    throw new Error(`Could not load payment transaction ${paymentTxid}: ${e instanceof Error ? e.message : String(e)}`)
  }

  const rawTx = dapiTx.transaction as any
  // Force copy into a plain JS Uint8Array in case rawTx is backed by WASM memory
  const txBytes = Uint8Array.from(rawTx)
  const paymentTx = Transaction.fromBytes(txBytes)
  if (paymentTx.hash() !== paymentTxid) {
    throw new Error(`Transaction hash mismatch for ${paymentTxid}: transaction data is corrupt`)
  }

  if (!dapiTx.isInstantLocked && !dapiTx.isChainLocked && dapiTx.confirmations < MIN_PAYMENT_TX_CONFIRMATIONS) {
    throw new Error(
      `Payment transaction ${paymentTxid} is not locked or confirmed yet. ` +
      'Please wait for an instant lock or at least one confirmation before proceeding.'
    )
  }

  // Locate the output that pays to the one-time address.
  // If outputIndex is provided, use it; otherwise scan outputs for the one
  // whose P2PKH script matches oneTimeAddress.
  let resolvedOutputIndex: number
  if (outputIndex != null) {
    resolvedOutputIndex = outputIndex
  } else {
    const expectedScriptHex = Output.createP2PKH(0n, oneTimeAddress).script.hex()
    resolvedOutputIndex = paymentTx.outputs.findIndex(
      o => o.script.hex() === expectedScriptHex
    )
    if (resolvedOutputIndex === -1) {
      throw new Error(
        `Could not find output paying to ${oneTimeAddress} in transaction ${paymentTxid}`
      )
    }
  }

  if (resolvedOutputIndex >= paymentTx.outputs.length) {
    throw new Error(
      `outputIndex ${resolvedOutputIndex} is out of range (transaction has ${paymentTx.outputs.length} outputs)`
    )
  }

  const paymentOutput = paymentTx.outputs[resolvedOutputIndex]

  const privateKey = PrivateKey.fromWIF(oneTimePrivateKeyWif)
  const lockingScript = Output.createP2PKH(0n, privateKey.getAddress()).script

  // Build a dummy signed tx to measure byte size for fee calculation.
  // Amounts are fixed-width (int64) in serialization, so any dummy lockedAmount gives
  // the exact same byte length as the real tx.
  const dummyPayloadOutput = Output.createP2PKH(MIN_FEE_RELAY, oneTimeAddress)
  const dummyTx = new Transaction(
    [],
    [new Output(MIN_FEE_RELAY, Script.fromASM('OP_RETURN OP_0'))],
    undefined,
    undefined,
    TransactionType.TRANSACTION_ASSET_LOCK,
    new ExtraPayload.AssetLockTx(1, 1, [dummyPayloadOutput])
  )
  dummyTx.addInput(new Input(paymentTxid, resolvedOutputIndex, lockingScript, 0))
  dummyTx.sign(privateKey)

  const sizeFee = BigInt(dummyTx.bytes().byteLength) * BigInt(FEE_PER_BYTE)
  const fee = sizeFee > MIN_FEE_RELAY ? sizeFee : MIN_FEE_RELAY
  const lockedAmount = paymentOutput.satoshis - fee

  if (lockedAmount <= 0n) {
    throw new Error(
      `Payment output at index ${resolvedOutputIndex} (${paymentOutput.satoshis} duffs) ` +
      `is too small to cover the transaction fee (${fee} duffs)`
    )
  }

  // Build final tx with correct lockedAmount and no change output.
  // The miner fee is implicit: totalInput - lockedAmount = fee.
  const payloadOutput = Output.createP2PKH(lockedAmount, oneTimeAddress)
  const assetLockTx = new Transaction(
    [],
    [new Output(lockedAmount, Script.fromASM('OP_RETURN OP_0'))],
    undefined,
    undefined,
    TransactionType.TRANSACTION_ASSET_LOCK,
    new ExtraPayload.AssetLockTx(1, 1, [payloadOutput])
  )
  assetLockTx.addInput(new Input(paymentTxid, resolvedOutputIndex, lockingScript, 0))
  assetLockTx.sign(privateKey)

  return {
    assetLockTx,
    assetLockOutputIndex: 0 // single credit output → always index 0 in the asset lock payload
  }
}

export type AssetLockProof = InstantAssetLockProofParams | ChainAssetLockProofParams

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
  creditOutputAddress: string,
  pollIntervalMs: number = LOCK_POLL_INTERVAL_MS,
  timeoutMs: number = LOCK_TIMEOUT_MS,
  subscription?: ReturnType<DashCoreSDK['subscribeToTransactions']>
): Promise<AssetLockProof> => {
  let settled = false

  // ── Race 1: instant lock via subscription ────────────────────────────────
  const instantLockRace = async (): Promise<AssetLockProof> => {
    const sub = subscription ?? coreSDK.subscribeToTransactions([creditOutputAddress])
    for await (const event of sub) {
      if (settled) return await Promise.reject(new Error('cancelled'))

      if (event.event !== 'instantSendLockMessage') continue

      let instantLock: InstantLock
      try {
        instantLock = InstantLock.fromHex(event.data)
      } catch {
        continue
      }

      if (instantLock.txId !== txid) continue

      return coreSDK.utils.createAssetLockProof({ transaction: assetLockTx, instantLock, outputIndex: 0 }) as InstantAssetLockProofParams
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
                return {
                  type: 'chainLock' as const,
                  txid,
                  outputIndex: 0,
                  coreChainLockedHeight: dapiTx.height
                }
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

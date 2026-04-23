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
import type { BuildAssetLockFromPaymentOptions, AssetLockBuildResult, AssetLockProof } from '../../types/AssetLock'
import type { DashPlatformSDK } from 'dash-platform-sdk'
import { KeyType, Purpose, SecurityLevel, PrivateKeyWASM, StateTransitionWASM } from 'dash-platform-sdk/types'
import { wait } from '../../utils'
import {
  MIN_FEE_RELAY,
  LOCK_POLL_INTERVAL_MS,
  LOCK_TIMEOUT_MS,
  MIN_PAYMENT_TX_CONFIRMATIONS
} from '../../constants'

// ── Payment tx → asset lock ───────────────────────────────────────────────────

/**
 * Builds an asset lock transaction from a payment transaction.
 *
 * Steps:
 *  1. Fetch and verify the payment tx (hash must match txid)
 *  2. Confirm it's locked (instant/chain) or confirmed (≥1 confirmation)
 *  3. Find the output paying to the funding address (by outputIndex or index 0)
 *  4. Build asset lock tx via DashCoreSDK.createAssetLockTransaction (Core primitive)
 */
export const buildAssetLockFromPaymentTx = async (
  options: BuildAssetLockFromPaymentOptions
): Promise<AssetLockBuildResult> => {
  const { coreSDK, paymentTxid, fundingAddress, fundingPrivateKeyWif, outputIndex } = options

  const dapiTx = await coreSDK.getTransaction(paymentTxid).catch((e: unknown) => {
    throw new Error(`Could not load payment transaction ${paymentTxid}: ${e instanceof Error ? e.message : String(e)}`)
  })

  const paymentTx = Transaction.fromBytes(Uint8Array.from(dapiTx.transaction))
  if (paymentTx.hash() !== paymentTxid) {
    throw new Error(`Transaction hash mismatch for ${paymentTxid}: transaction data is corrupt`)
  }

  if (!dapiTx.isInstantLocked && !dapiTx.isChainLocked && dapiTx.confirmations < MIN_PAYMENT_TX_CONFIRMATIONS) {
    throw new Error(
      `Payment transaction ${paymentTxid} is not locked or confirmed yet. ` +
      'Please wait for an instant lock or at least one confirmation before proceeding.'
    )
  }

  // Locate the output that pays to the funding address.
  // If outputIndex is provided, use it; otherwise scan outputs for the one
  // whose P2PKH script matches fundingAddress.
  let resolvedOutputIndex: number
  if (outputIndex != null) {
    resolvedOutputIndex = outputIndex
  } else {
    const expectedScriptHex = Output.createP2PKH(0n, fundingAddress).script.hex()
    resolvedOutputIndex = paymentTx.outputs.findIndex(
      o => o.script.hex() === expectedScriptHex
    )
    if (resolvedOutputIndex === -1) {
      throw new Error(
        `Could not find output paying to ${fundingAddress} in transaction ${paymentTxid}`
      )
    }
  }

  if (resolvedOutputIndex >= paymentTx.outputs.length) {
    throw new Error(
      `outputIndex ${resolvedOutputIndex} is out of range (transaction has ${paymentTx.outputs.length} outputs)`
    )
  }

  const paymentOutput = paymentTx.outputs[resolvedOutputIndex]

  const privateKey = PrivateKey.fromWIF(fundingPrivateKeyWif)
  const lockingScript = Output.createP2PKH(0n, privateKey.getAddress()).script
  const lockedAmount = paymentOutput.satoshis - MIN_FEE_RELAY

  if (lockedAmount <= 0n) {
    throw new Error(
      `Payment output at index ${resolvedOutputIndex} (${paymentOutput.satoshis} duffs) ` +
      `is too small to cover the transaction fee (${MIN_FEE_RELAY} duffs)`
    )
  }

  const payloadOutput = Output.createP2PKH(lockedAmount, fundingAddress)
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

export const IDENTITY_KEY_DEFINITIONS = [
  { id: 0, purpose: Purpose.AUTHENTICATION, securityLevel: SecurityLevel.MASTER   },
  { id: 1, purpose: Purpose.AUTHENTICATION, securityLevel: SecurityLevel.HIGH     },
  { id: 2, purpose: Purpose.ENCRYPTION,     securityLevel: SecurityLevel.MEDIUM   },
  { id: 3, purpose: Purpose.TRANSFER,       securityLevel: SecurityLevel.CRITICAL },
] as const

/**
 * Builds and signs an identity create state transition.
 *
 * Two-pass signing:
 *  1. Sign with each identity key to produce proof-of-possession signatures.
 *     Each signByPrivateKey overwrites the same WASM memory — copy out immediately.
 *  2. Re-create the ST with signed keys, then sign with the funding key.
 */
export const buildIdentityCreateTransition = (
  identityPrivateKeys: PrivateKeyWASM[],
  fundingPrivateKey: PrivateKeyWASM,
  assetLockProof: AssetLockProof,
  sdk: DashPlatformSDK
): StateTransitionWASM => {
  const identityPublicKeysInCreation = IDENTITY_KEY_DEFINITIONS.map(({ id, purpose, securityLevel }, i) => ({
    id,
    purpose,
    securityLevel,
    keyType: KeyType.ECDSA_SECP256K1,
    readOnly: false,
    data: Uint8Array.from(identityPrivateKeys[i].getPublicKey().bytes()),
    signature: undefined as Uint8Array | undefined
  }))

  let stateTransition = sdk.identities.createStateTransition('create', {
    publicKeys: identityPublicKeysInCreation,
    assetLockProof
  })

  for (let i = 0; i < identityPrivateKeys.length; i++) {
    stateTransition.signByPrivateKey(identityPrivateKeys[i], undefined, KeyType.ECDSA_SECP256K1)
    if (stateTransition.signature == null) {
      throw new Error(`signByPrivateKey did not produce a signature for identity key ${i}`)
    }
    identityPublicKeysInCreation[i].signature = Uint8Array.from(stateTransition.signature)
  }

  stateTransition = sdk.identities.createStateTransition('create', {
    publicKeys: identityPublicKeysInCreation,
    assetLockProof
  })

  stateTransition.signByPrivateKey(fundingPrivateKey, undefined, KeyType.ECDSA_SECP256K1)

  return stateTransition
}

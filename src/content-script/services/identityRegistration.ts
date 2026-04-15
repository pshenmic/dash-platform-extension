import {
  DashCoreSDK,
  ExtraPayload,
  Input,
  Network,
  Output,
  PrivateKey,
  Script,
  Transaction,
  TransactionType
} from 'dash-core-sdk'
import type { TransactionInputToSign } from 'dash-core-sdk'
import { PrivateKeyWASM } from 'dash-platform-sdk/types'
import hash from 'hash.js'
import { decrypt } from 'eciesjs'
import { hexToBytes, wait } from '../../utils'

const FEE_PER_BYTE = 1
const MIN_FEE_RELAY = 1000n
const CHAIN_LOCK_POLL_INTERVAL_MS = 5000
const CHAIN_LOCK_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

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

// ── Asset lock transaction builder ────────────────────────────────────────────

export interface AssetLockUtxo {
  txid: string
  vout: number
  satoshis: number | bigint
  privateKeyWif: string
}

export interface AssetLockCreditOutput {
  address: string
  amountSatoshis: number | bigint
}

export interface BuildAssetLockTransactionOptions {
  network: string
  utxos: AssetLockUtxo[]
  creditOutputs: AssetLockCreditOutput[]
  changeAddress?: string
}

function toSatoshis (amount: number | bigint, fieldName: string): bigint {
  if (typeof amount === 'bigint') {
    if (amount < 0n) throw new Error(`${fieldName} must be a non-negative integer`)
    return amount
  }
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error(`${fieldName} must be a non-negative safe integer`)
  }
  return BigInt(amount)
}

function getRequiredFee (transaction: Transaction): bigint {
  return BigInt(Math.max(Number(MIN_FEE_RELAY), transaction.bytes().byteLength * FEE_PER_BYTE))
}

function rebalanceFee (transaction: Transaction, totalInput: bigint, signingInputs: TransactionInputToSign[]): void {
  while (true) {
    transaction.signInputs(signingInputs)
    const fee = totalInput - transaction.getOutputAmount()
    const required = getRequiredFee(transaction)

    if (fee >= required) return

    if (transaction.outputs.length < 2) {
      throw new Error(
        `Insufficient fee for asset lock transaction: got ${fee} satoshis, need at least ${required}`
      )
    }

    const missing = required - fee
    const changeIdx = transaction.outputs.length - 1
    const changeOutput = transaction.outputs[changeIdx]
    const nextChange = changeOutput.satoshis - missing

    if (nextChange >= MIN_FEE_RELAY) {
      changeOutput.satoshis = nextChange
      continue
    }

    transaction.outputs.splice(changeIdx, 1)
  }
}

/**
 * Builds a signed asset lock transaction from UTXOs.
 * Contains the full construction logic previously in DashCoreSDK.createAssetLockTransaction.
 */
export function buildAssetLockTransaction (options: BuildAssetLockTransactionOptions): Transaction {
  const { network, utxos, creditOutputs, changeAddress } = options

  if (utxos.length === 0) throw new Error('At least one UTXO is required')
  if (creditOutputs.length === 0) throw new Error('At least one credit output is required')
  if (creditOutputs.length > 255) throw new Error('Asset lock transactions support at most 255 credit outputs')

  const networkType = network === 'mainnet' ? Network.Mainnet : Network.Testnet

  const payloadOutputs = creditOutputs.map((co, i) => {
    const amount = toSatoshis(co.amountSatoshis, `Credit output at index ${i}`)
    if (amount === 0n) throw new Error(`Credit output amount at index ${i} must be greater than 0`)
    return Output.createP2PKH(amount, co.address)
  })

  const lockedAmount = payloadOutputs.reduce((sum, o) => sum + o.satoshis, 0n)

  const transaction = new Transaction(
    [],
    [Output.createAssetLockBurn(lockedAmount)],
    undefined,
    undefined,
    TransactionType.TRANSACTION_ASSET_LOCK,
    new ExtraPayload.AssetLockTx(1, payloadOutputs.length, payloadOutputs)
  )

  let totalInput = 0n
  const signingInputs: TransactionInputToSign[] = []

  for (let i = 0; i < utxos.length; i++) {
    const utxo = utxos[i]
    const amount = toSatoshis(utxo.satoshis, `UTXO at index ${i}`)
    const privateKey = PrivateKey.fromWIF(utxo.privateKeyWif)

    if (privateKey.network !== networkType) {
      throw new Error(`UTXO private key at index ${i} does not match network (expected ${network})`)
    }

    totalInput += amount
    transaction.addInput(new Input(utxo.txid, utxo.vout, new Script(), 0))
    signingInputs.push({
      inputIndex: i,
      privateKey,
      lockingScript: Output.createP2PKH(0n, privateKey.getAddress()).script
    })
  }

  if (totalInput <= lockedAmount) {
    throw new Error('UTXO total must be greater than locked amount to cover the transaction fee')
  }

  const effectiveChangeAddress = changeAddress ?? signingInputs[0].privateKey.getAddress()
  transaction.generateChange(effectiveChangeAddress, totalInput)
  rebalanceFee(transaction, totalInput, signingInputs)

  return transaction
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
  const { coreSDK, network, paymentTxid, oneTimeAddress, oneTimePrivateKeyWif, outputIndex } = options

  // Load the payment transaction from DAPI
  let dapiTx: Awaited<ReturnType<DashCoreSDK['getTransaction']>>

  try {
    dapiTx = await coreSDK.getTransaction(paymentTxid)
  } catch (e) {
    throw new Error(`Could not load payment transaction ${paymentTxid}: ${e instanceof Error ? e.message : String(e)}`)
  }

  const paymentTx = Transaction.fromBytes(dapiTx.transaction)

  if (paymentTx.hash() !== paymentTxid) {
    throw new Error(`Transaction hash mismatch for ${paymentTxid}: transaction data is corrupt`)
  }

  if (!dapiTx.isInstantLocked && !dapiTx.isChainLocked && dapiTx.confirmations < 1) {
    throw new Error(
      `Payment transaction ${paymentTxid} is not locked or confirmed yet. ` +
      'Please wait for an instant lock or at least one confirmation before proceeding.'
    )
  }

  // Locate the output that pays to the one-time address.
  // The caller should pass outputIndex when known; fallback is index 0.
  const resolvedOutputIndex: number = outputIndex ?? 0

  if (resolvedOutputIndex >= paymentTx.outputs.length) {
    throw new Error(
      `outputIndex ${resolvedOutputIndex} is out of range (transaction has ${paymentTx.outputs.length} outputs)`
    )
  }

  const paymentOutput = paymentTx.outputs[resolvedOutputIndex]
  const lockedAmount = paymentOutput.satoshis - MIN_FEE_RELAY

  if (lockedAmount <= 0n) {
    throw new Error(
      `Payment output at index ${resolvedOutputIndex} (${paymentOutput.satoshis} duffs) ` +
      `is too small to cover the minimum relay fee (${MIN_FEE_RELAY} duffs)`
    )
  }

  const assetLockTx = buildAssetLockTransaction({
    network,
    utxos: [
      {
        txid: paymentTxid,
        vout: resolvedOutputIndex,
        satoshis: paymentOutput.satoshis,
        privateKeyWif: oneTimePrivateKeyWif
      }
    ],
    creditOutputs: [
      {
        address: oneTimeAddress,
        amountSatoshis: lockedAmount
      }
    ],
    changeAddress: oneTimeAddress
  })

  return {
    assetLockTx,
    assetLockOutputIndex: 0 // single credit output → always index 0 in the asset lock payload
  }
}

export interface WaitForChainLockResult {
  txid: string
  coreChainLockedHeight: number
}

/**
 * Polls getTransaction until isChainLocked === true, then returns the block height.
 * Throws with a clear message on timeout.
 */
export const waitForAssetLockChainLock = async (
  coreSDK: DashCoreSDK,
  txid: string,
  pollIntervalMs: number = CHAIN_LOCK_POLL_INTERVAL_MS,
  timeoutMs: number = CHAIN_LOCK_TIMEOUT_MS
): Promise<WaitForChainLockResult> => {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    let dapiTx: Awaited<ReturnType<DashCoreSDK['getTransaction']>>

    try {
      dapiTx = await coreSDK.getTransaction(txid)
    } catch {
      // Transient error — keep polling
      await wait(pollIntervalMs)
      continue
    }

    if (dapiTx.isChainLocked) {
      return { txid, coreChainLockedHeight: dapiTx.height }
    }

    await wait(pollIntervalMs)
  }

  throw new Error(
    `Timed out waiting for chain lock on asset lock transaction ${txid}. ` +
    `Elapsed: ${timeoutMs / 1000}s. The transaction may still be confirmed — ` +
    'try resuming registration once the network has processed the block.'
  )
}

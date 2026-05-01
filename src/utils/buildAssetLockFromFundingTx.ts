import {
  DashCoreSDK,
  ExtraPayload,
  Input,
  Output,
  PrivateKey,
  Script,
  Transaction,
  TransactionType
} from 'dash-core-sdk'
import type { AssetLockBuildResult } from '../types/AssetLockBuildResult'
import {
  MIN_FEE_RELAY,
  MIN_ASSET_LOCK_FUNDING_TX_CONFIRMATIONS
} from '../constants'

/**
 * Builds an asset lock transaction from an asset lock funding transaction.
 *
 * Steps:
 *  1. Fetch and verify the funding tx (hash must match txid)
 *  2. Confirm it's locked (instant/chain) or confirmed (>=1 confirmation)
 *  3. Find the output paying to the asset lock funding address
 *  4. Build asset lock tx: input + credit output both bound to the funding address
 *
 * The funding key is single-use per DIP-0011: it signs the input, owns the
 * credit output, and later signs the IdentityCreateTransition.
 */
export const buildAssetLockFromFundingTx = async (
  coreSDK: DashCoreSDK,
  assetLockFundingTxid: string,
  assetLockFundingAddress: string,
  assetLockFundingPrivateKeyWif: string
): Promise<AssetLockBuildResult> => {
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

  const expectedScriptHex = Output.createP2PKH(0n, assetLockFundingAddress).script.hex()
  const resolvedOutputIndex = fundingTx.outputs.findIndex(
    o => o.script.hex() === expectedScriptHex
  )

  if (resolvedOutputIndex === -1) {
    throw new Error(
      `Could not find output paying to ${assetLockFundingAddress} in transaction ${assetLockFundingTxid}`
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
    assetLockOutputIndex: 0 // single credit output -> always index 0 in the asset lock payload
  }
}

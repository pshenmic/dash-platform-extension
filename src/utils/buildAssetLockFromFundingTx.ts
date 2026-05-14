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
 *  3. Aggregate ALL outputs paying to the asset lock funding address
 *  4. Build asset lock tx: one input per matching output, single credit
 *     output directed to creditOutputAddress
 *
 * Multiple matching outputs can occur when the sender's wallet uses coin
 * selection that produces several outputs to the same destination address
 * (e.g. dust). Ignoring extras would silently lose funds.
 *
 * The funding key signs every input. The credit output is owned by a
 * separate key (per DIP-0013): the identity registration or top-up key
 * derived from the wallet seed. That key later signs the Platform ST.
 */
export const buildAssetLockFromFundingTx = async (
  coreSDK: DashCoreSDK,
  assetLockFundingTxid: string,
  assetLockFundingAddress: string,
  assetLockFundingPrivateKeyWif: string,
  creditOutputAddress: string
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
  const matchingOutputs = fundingTx.outputs
    .map((output, index) => ({ output, index }))
    .filter(({ output }) => output.script.hex() === expectedScriptHex)

  if (matchingOutputs.length === 0) {
    throw new Error(
      `Could not find any output paying to ${assetLockFundingAddress} in transaction ${assetLockFundingTxid}`
    )
  }

  const totalFunding = matchingOutputs.reduce((sum, { output }) => sum + output.satoshis, 0n)
  const lockedAmount = totalFunding - MIN_FEE_RELAY

  if (lockedAmount <= 0n) {
    throw new Error(
      `Total funding (${totalFunding.toString()} duffs across ${matchingOutputs.length} output${matchingOutputs.length === 1 ? '' : 's'}) ` +
      `is too small to cover the transaction fee (${MIN_FEE_RELAY.toString()} duffs)`
    )
  }

  const assetLockFundingPrivateKey = PrivateKey.fromWIF(assetLockFundingPrivateKeyWif)
  const lockingScript = Output.createP2PKH(0n, assetLockFundingPrivateKey.getAddress()).script
  const creditOutput = Output.createP2PKH(lockedAmount, creditOutputAddress)

  const assetLockTx = new Transaction(
    [],
    [new Output(lockedAmount, Script.fromASM('OP_RETURN OP_0'))],
    undefined,
    undefined,
    TransactionType.TRANSACTION_ASSET_LOCK,
    new ExtraPayload.AssetLockTx(1, 1, [creditOutput])
  )

  for (const { index } of matchingOutputs) {
    assetLockTx.addInput(new Input(assetLockFundingTxid, index, lockingScript, 0))
  }

  assetLockTx.sign(assetLockFundingPrivateKey)

  return {
    assetLockTx,
    assetLockOutputIndex: 0
  }
}

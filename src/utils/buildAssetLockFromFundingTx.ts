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
  FEE_PER_BYTE,
  SIGNED_INPUT_MAX_SIZE,
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
 *     output for the summed amount minus fee
 *
 * Multiple matching outputs can occur when the sender's wallet uses coin
 * selection that produces several outputs to the same destination address
 * (e.g. dust). Ignoring extras would silently lose funds.
 *
 * Fee policy: max(estimatedSignedSize * FEE_PER_BYTE, MIN_FEE_RELAY).
 *
 * The funding key is single-use per DIP-0011: it signs every input, owns
 * the credit output, and later signs the IdentityCreateTransition.
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
  const matchingOutputs = fundingTx.outputs
    .map((output, index) => ({ output, index }))
    .filter(({ output }) => output.script.hex() === expectedScriptHex)

  if (matchingOutputs.length === 0) {
    throw new Error(
      `Could not find any output paying to ${assetLockFundingAddress} in transaction ${assetLockFundingTxid}`
    )
  }

  const totalFunding = matchingOutputs.reduce((sum, { output }) => sum + output.satoshis, 0n)

  const assetLockFundingPrivateKey = PrivateKey.fromWIF(assetLockFundingPrivateKeyWif)
  const lockingScript = Output.createP2PKH(0n, assetLockFundingPrivateKey.getAddress()).script

  // Output size is independent of the satoshis value (fixed 8 bytes), so we
  // build the tx with totalFunding as a placeholder, measure size, compute
  // fee, then mutate satoshis on both the OP_RETURN tx output and the
  // extra-payload credit output before signing.
  const creditOutput = Output.createP2PKH(totalFunding, assetLockFundingAddress)
  const assetLockExtraPayload = new ExtraPayload.AssetLockTx(1, 1, [creditOutput])
  const assetLockTx = new Transaction(
    [],
    [new Output(totalFunding, Script.fromASM('OP_RETURN OP_0'))],
    undefined,
    undefined,
    TransactionType.TRANSACTION_ASSET_LOCK,
    assetLockExtraPayload
  )
  for (const { index } of matchingOutputs) {
    assetLockTx.addInput(new Input(assetLockFundingTxid, index, lockingScript, 0))
  }

  // Mirrors dash-core-sdk Transaction.generateChange: strip unsigned inputs,
  // then add SIGNED_INPUT_MAX_SIZE per input to estimate the final signed size.
  const dummyTx = Transaction.fromBytes(assetLockTx.bytes())
  dummyTx.inputs = []
  const estimatedSignedSize =
    BigInt(dummyTx.bytes().byteLength) +
    BigInt(matchingOutputs.length) * SIGNED_INPUT_MAX_SIZE
  const sizeBasedFee = estimatedSignedSize * FEE_PER_BYTE
  const fee = sizeBasedFee < MIN_FEE_RELAY ? MIN_FEE_RELAY : sizeBasedFee

  const lockedAmount = totalFunding - fee
  if (lockedAmount <= 0n) {
    throw new Error(
      `Total funding (${totalFunding.toString()} duffs across ${matchingOutputs.length} output${matchingOutputs.length === 1 ? '' : 's'}) ` +
      `is too small to cover the transaction fee (${fee.toString()} duffs)`
    )
  }

  assetLockTx.outputs[0].satoshis = lockedAmount
  assetLockExtraPayload.outputs[0].satoshis = lockedAmount

  assetLockTx.sign(assetLockFundingPrivateKey)

  return {
    assetLockTx,
    assetLockOutputIndex: 0
  }
}

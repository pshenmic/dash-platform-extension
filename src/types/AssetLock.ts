import type { DashCoreSDK, Transaction } from 'dash-core-sdk'
import type { InstantAssetLockProofParams, ChainAssetLockProofParams } from 'dash-core-sdk/src/utils.js'

export interface BuildAssetLockFromFundingTxOptions {
  coreSDK: DashCoreSDK
  network: string
  /** Hash of the funding transaction whose output is being spent. */
  assetLockFundingTxid: string
  /** Address that owns the funding UTXO (input being spent). */
  assetLockFundingAddress: string
  /** WIF of the key that controls assetLockFundingAddress (signs the input). */
  assetLockFundingPrivateKeyWif: string
  /**
   * Address that receives the asset lock credit output (in the payload).
   * Per DIP-0011 this address must own the key that signs the
   * IdentityCreateTransition. Decoupled from assetLockFundingAddress so the
   * registration key can be derived stateless from the seed at the on-chain
   * free identityIndex.
   */
  creditOutputAddress: string
  /** Optional: index of the funding output in the funding transaction. */
  outputIndex?: number
}

export interface AssetLockBuildResult {
  assetLockTx: Transaction
  assetLockOutputIndex: number
}

export type AssetLockProof = InstantAssetLockProofParams | ChainAssetLockProofParams

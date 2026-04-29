import type { DashCoreSDK, Transaction } from 'dash-core-sdk'
import type { InstantAssetLockProofParams, ChainAssetLockProofParams } from 'dash-core-sdk/src/utils.js'

export interface BuildAssetLockFromFundingTxOptions {
  coreSDK: DashCoreSDK
  network: string
  /** Hash of the funding transaction whose output is being spent. */
  assetLockFundingTxid: string
  /** One-time funding address (input UTXO + asset lock credit output). */
  assetLockFundingAddress: string
  /** WIF of the one-time key that controls assetLockFundingAddress. */
  assetLockFundingPrivateKeyWif: string
  /** Optional: index of the funding output in the funding transaction. */
  outputIndex?: number
}

export interface AssetLockBuildResult {
  assetLockTx: Transaction
  assetLockOutputIndex: number
}

export type AssetLockProof = InstantAssetLockProofParams | ChainAssetLockProofParams

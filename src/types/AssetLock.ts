import type { DashCoreSDK, Transaction } from 'dash-core-sdk'
import type { InstantAssetLockProofParams, ChainAssetLockProofParams } from 'dash-core-sdk/src/utils.js'

export interface BuildAssetLockFromFundingTxOptions {
  coreSDK: DashCoreSDK
  network: string
  assetLockFundingTxid: string
  assetLockFundingAddress: string
  assetLockFundingPrivateKeyWif: string
  outputIndex?: number
}

export interface AssetLockBuildResult {
  assetLockTx: Transaction
  assetLockOutputIndex: number
}

export type AssetLockProof = InstantAssetLockProofParams | ChainAssetLockProofParams

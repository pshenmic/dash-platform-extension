import type { DashCoreSDK, Transaction } from 'dash-core-sdk'
import type { InstantAssetLockProofParams, ChainAssetLockProofParams } from 'dash-core-sdk/src/utils.js'

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

export type AssetLockProof = InstantAssetLockProofParams | ChainAssetLockProofParams

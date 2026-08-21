import type { Transaction } from 'dash-core-sdk'

export interface AssetLockBuildResult {
  assetLockTx: Transaction
  assetLockOutputIndex: number
}

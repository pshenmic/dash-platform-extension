import { NetworkType } from '../../NetworkType'

export interface DiscardAssetLockFundingPayload {
  // The funding address whose recorded payment is to be forgotten.
  fundingAddress: string
  // The (network, wallet) the address belongs to. Optional, same contract as the
  // other asset lock methods: the record is stored under this pair.
  walletId?: string
  network?: NetworkType
}

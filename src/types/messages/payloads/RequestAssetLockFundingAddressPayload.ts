import { AssetLockFundingPurpose } from '../../../content-script/storage/storageSchema'

export interface RequestAssetLockFundingAddressPayload {
  // What the address is for. Addresses are handed out per purpose, so a deposit
  // meant to fund a Platform address or a shield is never the one an unfinished
  // identity registration is waiting on. Defaults to 'registration'.
  purpose?: Extract<AssetLockFundingPurpose, 'registration' | 'fundAddress' | 'shield'>
}

import { AssetLockFundingPurpose } from '../../../content-script/storage/storageSchema'

export interface RecoverableAssetLockFundingAddress {
  address: string
  purpose: AssetLockFundingPurpose
  // Unspent total at the address, in duffs. null when the caller asked for the
  // storage-only listing.
  balanceDuffs: string | null
  utxoCount: number | null
  // False when the entry carries no key to decrypt. The funding key of these
  // addresses was a one-time random key, never derived from the seed, so an
  // entry without one has no way to be spent and its deposit cannot be moved.
  hasKey: boolean
  identityId: string | null
  recipient: string | null
}

export interface ListRecoverableAssetLockFundsResponse {
  addresses: RecoverableAssetLockFundingAddress[]
}

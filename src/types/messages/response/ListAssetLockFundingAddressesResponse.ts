import { AssetLockFundingPurpose } from '../../../content-script/storage/storageSchema'

/**
 * Where one funding address stands.
 *
 * - `recoverable` - never used and no asset lock against it, so anything sent here
 *    is still sitting on L1 unspent and this extension can sweep it.
 * - `committed` - an asset lock already spends it, but the operation that built
 *    that asset lock never finished. Only finishing that operation gets the money
 *    back; the address itself has nothing left to sweep.
 * - `spent` - the operation completed. The address is empty and the entry survives
 *    only as a record of what this wallet was once given.
 */
export type AssetLockFundingAddressState = 'recoverable' | 'committed' | 'spent'

export interface AssetLockFundingAddressInfo {
  address: string
  purpose: AssetLockFundingPurpose
  state: AssetLockFundingAddressState
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
  // The asset lock spending this address, when one was built.
  assetLockTxid: string | null
}

export interface ListAssetLockFundingAddressesResponse {
  addresses: AssetLockFundingAddressInfo[]
}

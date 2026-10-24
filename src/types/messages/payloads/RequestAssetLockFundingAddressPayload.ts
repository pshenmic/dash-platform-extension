import { AssetLockFundingPurpose } from '../../../content-script/storage/storageSchema'

export interface RequestAssetLockFundingAddressPayload {
  // What the address is for. Addresses are handed out per purpose, so a deposit
  // meant to fund a Platform address or a shield is never the one an unfinished
  // identity registration is waiting on. Defaults to 'registration'.
  purpose?: Extract<AssetLockFundingPurpose, 'registration' | 'fundAddress' | 'shield'>
  // Who the deposit is for: the platform address a funding will credit, or the
  // shielded address a shield will deposit into ('own' for the wallet's own
  // pool). An address is only ever reused for the same recipient, so an
  // operation interrupted after paying cannot have its deposit handed to the
  // next one. A registration creates its recipient and names none.
  recipient?: string
}

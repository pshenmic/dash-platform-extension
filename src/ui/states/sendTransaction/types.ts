// Resolved action, derived from asset + sender type + recipient type.
// 'withdraw'         — platform address → Core (L1) address
// 'shield'           — platform address → the wallet's own shielded pool
// 'unshield'         — shielded pool → platform address
// 'shieldedTransfer' — shielded pool → someone else's shielded address
// 'shieldedWithdraw' — shielded pool → Core (L1) address
export type TransferMode =
  | 'creditTransfer'
  | 'tokenTransfer'
  | 'fund'
  | 'send'
  | 'topup'
  | 'withdraw'
  | 'shield'
  | 'unshield'
  | 'shieldedTransfer'
  | 'shieldedWithdraw'
  | 'unsupported'
  | 'incomplete'

// Modes carrying an Orchard (Halo2) proof — CPU-heavy, need the long-loading UX.
export const SHIELDED_MODES: TransferMode[] = ['shield', 'unshield', 'shieldedTransfer', 'shieldedWithdraw']

// Where the credits/tokens are sent from.
export type SenderType = 'identity' | 'platform' | 'shielded'

export interface PlatformAddressEntry {
  address: string
  derivationPath: string
  index: number
}

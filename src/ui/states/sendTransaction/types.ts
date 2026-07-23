// Resolved action, derived from asset + sender type + recipient kind.
export type TransferMode = 'creditTransfer' | 'tokenTransfer' | 'fund' | 'send' | 'topup' | 'incomplete'

// Where the credits/tokens are sent from.
export type SenderType = 'identity' | 'platform'

export interface PlatformAddressEntry {
  address: string
  derivationPath: string
  index: number
}

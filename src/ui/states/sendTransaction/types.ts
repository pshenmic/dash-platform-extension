// Resolved action, derived from asset + sender type + recipient type.
// 'withdraw'         - platform address -> Core (L1) address
// 'identityWithdraw' - identity -> Core (L1) address
// 'shield'           - platform address -> the wallet's own shielded pool
// 'unshield'         - shielded pool -> platform address
// 'shieldedTransfer' - shielded pool -> someone else's shielded address
// 'shieldedWithdraw' - shielded pool -> Core (L1) address
// 'coreSend' / 'coreTopUp' / 'coreFund' / 'coreShield' - Core (L1) wallet UTXOs to Core / identity / platform address / shielded
export type TransferMode =
  | 'coreSend'
  | 'coreTopUp'
  | 'coreFund'
  | 'coreShield'
  | 'creditTransfer'
  | 'tokenTransfer'
  | 'fund'
  | 'send'
  | 'topup'
  | 'withdraw'
  | 'identityWithdraw'
  | 'shield'
  | 'unshield'
  | 'shieldedTransfer'
  | 'shieldedWithdraw'
  | 'unsupported'

// Modes carrying an Orchard (Halo2) proof - CPU-heavy, need the long-loading UX.
export const SHIELDED_MODES: TransferMode[] = ['shield', 'unshield', 'shieldedTransfer', 'shieldedWithdraw']

// Dashboard the send screen was opened from; only the identity scope offers tokens.
export type SendScope = 'all' | 'core' | 'platform' | 'identity'

// Side of a transfer: Dash Core (L1), identity, platform address or shielded pool.
export type EndpointType = 'core' | 'identity' | 'platformAddress' | 'shielded'

// Pair of endpoint types, e.g. 'core->identity'.
export type Direction = `${EndpointType}->${EndpointType}`

// What is transferred: Dash or a token of the source identity.
export type AssetId = { type: 'dash' } | { type: 'token', tokenId: string }

// Screens of the send wizard.
export type WizardStep = 'fromTo' | 'amount' | 'confirm' | 'progress' | 'result' | 'error'

export interface TransferSource {
  type: EndpointType
  identityId: string | null
}

export interface TransferTarget {
  type: EndpointType
  recipient: string
  shieldToMyself: boolean
}

// Advanced mode recipient; amount is in Dash as typed.
export interface TransferRecipient {
  id: string
  address: string
  amount: string
}

// State of the send wizard; amount is in Dash as typed.
export interface TransferDraft {
  from: TransferSource
  to: TransferTarget
  asset: AssetId
  amount: string
  isAdvanced: boolean
  recipients: TransferRecipient[]
  changeAddress: string | null
}

// Wallet identity offered as a transfer source, with its credit balance once known.
export interface SourceIdentity {
  identifier: string
  balance: bigint | null
}

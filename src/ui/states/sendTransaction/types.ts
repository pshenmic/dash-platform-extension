// Resolved action, derived from asset + sender type + recipient type.
// 'withdraw'         — platform address → Core (L1) address
// 'identityWithdraw' — identity → Core (L1) address
// 'shield'           — platform address → the wallet's own shielded pool
// 'unshield'         — shielded pool → platform address
// 'shieldedTransfer' — shielded pool → someone else's shielded address
// 'shieldedWithdraw' — shielded pool → Core (L1) address
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
  | 'incomplete'

// Modes carrying an Orchard (Halo2) proof — CPU-heavy, need the long-loading UX.
export const SHIELDED_MODES: TransferMode[] = ['shield', 'unshield', 'shieldedTransfer', 'shieldedWithdraw']

// Dashboard the send screen was opened from. Tokens belong to a single identity,
// so only the identity scope offers them.
export type SendScope = 'all' | 'core' | 'platform' | 'identity'

export interface PlatformAddressEntry {
  address: string
  derivationPath: string
  index: number
}

export interface ShieldedAddressEntry {
  address: string
  diversifierIndex: number | null
  balance: bigint
  spendableNotes: number
}

// Value of the "whole shielded balance" option in the source select — a real
// address never collides with it (they are long bech32m strings).
export const ALL_SHIELDED_SOURCES = 'all'

// Side of a transfer: Dash Core (L1), identity, platform address or shielded pool.
export type EndpointType = 'core' | 'identity' | 'platformAddress' | 'shielded'

// Pair of endpoint types, e.g. 'core->identity'.
export type Direction = `${EndpointType}->${EndpointType}`

// What is transferred: Dash or a token of the source identity.
export type AssetId = { type: 'dash' } | { type: 'token', tokenId: string }

// Screens of the send wizard.
export type WizardStep = 'fromTo' | 'amount' | 'confirm' | 'progress' | 'result' | 'error'

export interface UtxoRef {
  txid: string
  vout: number
}

// Address with an amount: credits for Platform, duffs for Core.
export interface AddressAmount {
  address: string
  amount: string
}

// Manual input selection made in Coin Control.
export type CoinControlSelection =
  | { type: 'automatic' }
  | { type: 'utxo', inputs: UtxoRef[] }
  | { type: 'platformInputs', inputs: AddressAmount[] }
  | { type: 'shieldedNotes', noteIds: string[] }

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
  coinControl: CoinControlSelection
  recipients: TransferRecipient[]
  changeAddress: string | null
}

// Unspent Core output of the wallet; amount is in duffs.
export interface CoreUtxo extends UtxoRef {
  address: string
  amount: string
  timestamp: number
  confirmations: number
}

// Spendable shielded note; amount is in credits.
export interface ShieldedNote {
  noteId: string
  address: string
  amount: string
}

export type TransferOperationType = 'shieldFromCore' | 'topUpFromCore' | 'fundAddressFromCore' | 'identityWithdraw' | 'addressWithdraw'

export type TransferStageStatus = 'pending' | 'active' | 'done' | 'failed'

// Multi-stage transfer tracked by the Progress screen.
export interface TransferOperation {
  operationId: string
  type: TransferOperationType
  stages: Array<{ id: string, status: TransferStageStatus }>
  coreTxHash?: string
  platformTxHash?: string
  fee?: string
  error?: string
}

// Wallet identity offered as a transfer source, with its credit balance once known.
export interface SourceIdentity {
  identifier: string
  balance: bigint | null
}

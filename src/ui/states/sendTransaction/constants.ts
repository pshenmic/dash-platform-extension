import type { RecipientSearchResult, TransferUnavailableReason } from '../../../utils'
import { SHIELDED_POOL_RECIPIENT } from '../../../constants'
import { PROVING_NOTE, WITHDRAW_TO_CORE_WARNING, SHIELDED_WITHDRAW_WARNING } from '../../constants/transferWarnings'
import type { TransferMode } from './types'

// Shown when the sender can't pay the chosen recipient type (no API for it).
export const UNSUPPORTED_TRANSFER_MESSAGE = 'This sender cannot pay this recipient. Change the sender or the recipient.'

// Hint shown on a disabled endpoint type.
export const UNAVAILABLE_REASON_HINTS: Record<TransferUnavailableReason, string> = {
  noCoreLayer: 'This wallet has no Dash Core (L1) layer.',
  noAddressLayer: 'This wallet has no platform addresses or shielded balance.',
  noPlatformAddresses: 'No platform addresses yet. Create one in the Addresses tab.',
  tokenRequiresIdentity: 'Tokens can only be sent from an identity to an identity.',
  unsupportedPair: UNSUPPORTED_TRANSFER_MESSAGE
}

// `shieldToPool` can only reach the wallet's own pool — a fixed choice, not typed.
export const SHIELDED_POOL_OPTIONS: RecipientSearchResult[] = [{
  identifier: SHIELDED_POOL_RECIPIENT,
  type: 'shieldedPool',
  label: 'My shielded balance'
}]

// Caution shown on the send screen per resolved mode, composed from the shared
// warning fragments (see ui/constants/transferWarnings).
export const MODE_WARNINGS: Partial<Record<TransferMode, string>> = {
  withdraw: WITHDRAW_TO_CORE_WARNING,
  identityWithdraw: WITHDRAW_TO_CORE_WARNING,
  shieldedWithdraw: SHIELDED_WITHDRAW_WARNING,
  shield: PROVING_NOTE,
  unshield: PROVING_NOTE,
  shieldedTransfer: PROVING_NOTE
}

// Labels of the wizard stepper.
export const WIZARD_STEP_LABELS = ['From & To', 'Amount', 'Confirm']

// Title of the Progress screen.
export const PROGRESS_TITLE = 'Transfer in progress'

// Shown while a multi-step transfer runs in this window.
export const KEEP_OPEN_MESSAGE = 'Keep this window open until the transfer completes.'

export const RECIPIENT_PLACEHOLDERS = {
  core: 'Enter Address',
  identity: 'Enter Identity',
  platformAddress: 'Enter Address',
  shielded: 'Shielded Address'
}

export const SHIELDED_UNLOCK_DESCRIPTION = 'Enter your password to unlock the shielded balance.'

// Error screen message for the sent asset.
export const transferErrorMessage = (asset: string): string => `An error occurred while sending ${asset}. Please try again.`

export const SAME_PARTY_MESSAGE = 'Recipient must be different from the sender.'

// Confirm screen caution for transfers leaving Platform for Core.
export const WITHDRAW_WARNINGS: Partial<Record<TransferMode, string>> = {
  identityWithdraw: WITHDRAW_TO_CORE_WARNING,
  withdraw: WITHDRAW_TO_CORE_WARNING,
  shieldedWithdraw: SHIELDED_WITHDRAW_WARNING
}

// Network fee shown when Retry finishes a top up whose Core payment was made earlier.
export const ALREADY_PAID_LABEL = 'Already paid'

export const PREPAID_TOP_UP_MESSAGE = 'Finishes a top up paid earlier. No new payment.'

// Warning on directions that still run on mocked backend methods.
export const MOCK_TRANSFER_WARNING = 'Preview: this transfer runs on a test mock and does not move any funds yet.'

// Top up from Core works only for identities of this wallet.
export const CORE_TOP_UP_OWN_IDENTITY_MESSAGE = 'Top up from Dash Core works only for identities in this wallet.'

// Most recipients one Advanced transfer can pay.
export const MAX_RECIPIENTS = 1000

// Estimated fee of a Core send while the wallet UTXOs are unknown: one input, recipient and change outputs.
export const CORE_TRANSFER_FEE_ESTIMATE_DUFFS = 226n

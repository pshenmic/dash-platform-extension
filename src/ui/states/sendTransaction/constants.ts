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

// Hint on the Core sender type until Core transfers are wired in.
export const CORE_SENDER_PENDING_HINT = 'Sending from Dash Core is coming soon.'

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

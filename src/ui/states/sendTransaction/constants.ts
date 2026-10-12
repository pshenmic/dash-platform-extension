import type { TransferUnavailableReason } from '../../../utils'
import { WITHDRAW_TO_CORE_WARNING, SHIELDED_WITHDRAW_WARNING } from '../../constants'
import type { TransferMode } from './types'

// Shown when the sender can't pay the chosen recipient type (no API for it).
const UNSUPPORTED_TRANSFER_MESSAGE = 'This sender cannot pay this recipient. Change the sender or the recipient.'

// Hint shown on a disabled endpoint type.
export const UNAVAILABLE_REASON_HINTS: Record<TransferUnavailableReason, string> = {
  noCoreLayer: 'This wallet has no Dash Core (L1) layer.',
  noAddressLayer: 'This wallet has no platform addresses or shielded balance.',
  noPlatformAddresses: 'No platform addresses yet. Create one in the Addresses tab.',
  tokenRequiresIdentity: 'Tokens can only be sent from an identity to an identity.',
  unsupportedPair: UNSUPPORTED_TRANSFER_MESSAGE
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

// Count of Advanced recipients, e.g. '2 recipients'.
export const recipientsCountLabel = (count: number): string => `${count} ${count === 1 ? 'recipient' : 'recipients'}`

// Error screen message for the sent asset.
export const transferErrorMessage = (asset: string): string => `An error occurred while sending ${asset}. Please try again.`

// Confirm screen caution for transfers leaving Platform for Core.
export const WITHDRAW_WARNINGS: Partial<Record<TransferMode, string>> = {
  identityWithdraw: WITHDRAW_TO_CORE_WARNING,
  withdraw: WITHDRAW_TO_CORE_WARNING,
  shieldedWithdraw: SHIELDED_WITHDRAW_WARNING
}

// Network fee shown when a top up reuses a Core payment made earlier.
export const ALREADY_PAID_LABEL = 'Already paid'

export const PREPAID_TOP_UP_MESSAGE = 'Finishes a top up paid earlier. No new payment.'

// Retry of a shielding from Core whose asset lock is already on L1: repeating it would pay again.
export const SHIELD_NOT_RESUMABLE_MESSAGE = 'This shielding was already paid on L1 and cannot be resumed yet. Retrying would pay again.'

// Most recipients one Advanced transfer can pay.
export const MAX_RECIPIENTS = 1000

// Estimated fee of a Core send while its estimate is loading or failed: one input, recipient and change outputs.
export const CORE_TRANSFER_FEE_ESTIMATE_DUFFS = 226n

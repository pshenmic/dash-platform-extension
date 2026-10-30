import type { TransferUnavailableReason } from '../../../utils'
import { WITHDRAW_TO_CORE_WARNING, SHIELDED_WITHDRAW_WARNING } from '../../constants'
import { MAX_CORE_OUTPUTS, MAX_PLATFORM_OUTPUTS } from '../../../constants'
import type { EndpointType, TransferMode } from './types'

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

// Network fee shown when a transfer finishes a Core payment made earlier.
export const ALREADY_PAID_LABEL = 'Already paid'

// Confirm notice for a draft continuing an unfinished operation.
export const PREPAID_TRANSFER_MESSAGE = 'Finishes a transfer paid earlier. No new payment.'

// Confirm notice when the recipient has an unfinished transfer that this call completes instead of the typed amount.
export const interruptedTransferMessage = (amount: string): string =>
  `The interrupted transfer of ${amount} Dash to this recipient will be completed first. The new amount won't be sent.`

// Result notice when the call finished an earlier unfinished operation instead of paying again.
export const UNSENDABLE_FUNDING_MESSAGE = 'The earlier payment cannot reach the network. Discard it to pay for this transfer anew; a payment still on its way is not discarded.'

export const CONTINUED_TRANSFER_MESSAGE = 'An earlier unfinished transfer to this recipient was completed. Nothing new was paid.'

// Most recipients one Advanced transfer from this source type can pay.
export const maxRecipients = (fromType: EndpointType): number => fromType === 'core' ? MAX_CORE_OUTPUTS : MAX_PLATFORM_OUTPUTS

// How long a loading fee estimate shows as pending before the fallback fee is shown.
export const ESTIMATE_GRACE_MS = 2500

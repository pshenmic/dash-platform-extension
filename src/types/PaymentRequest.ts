import { NetworkType } from './NetworkType'
import { PaymentRequestStatus } from './enums/PaymentRequestStatus'
import { PaymentTransaction, SendPaymentResult } from './SendPaymentResult'

// The three layers money can be paid to, and paid from.
export type PaymentAddressType = 'core' | 'platform' | 'orchard'
export type PaymentSourceType = 'core' | 'platform' | 'orchard'

// A transaction the payment signed, kept with its bytes until the payment
// completes: a repeat sends the very same transaction instead of paying again.
export type RecordedPaymentTransaction = PaymentTransaction & { hex?: string }

/**
 * A website's request to pay an address, and everything that happened to it.
 *
 * Bound at creation to the origin that asked and to the wallet and network that
 * were current then. Nothing about it is the website's to change afterwards:
 * the address and amount the user confirms are the ones stored here.
 */
export interface PaymentRequest {
  id: string
  // As the browser reported it for the message, never as the page named itself.
  origin: string
  network: NetworkType
  walletId: string
  // Canonical form, as the extension parsed it.
  address: string
  addressType: PaymentAddressType
  // What the recipient receives, in duffs. Fees come on top.
  amountDuffs: string
  status: PaymentRequestStatus
  createdAt: number
  // Set when the user confirms.
  source: PaymentSourceType | null
  // The fee the user confirmed, in duffs. A payment that would cost more is
  // stopped before it is sent and shown to the user again.
  feeDuffs: string | null
  transactions: RecordedPaymentTransaction[]
  result: SendPaymentResult | null
  // Why it was rejected or failed, or what went wrong in the attempt that left
  // it pending or processing.
  error: string | null
}

// What the website that asked may know about its request.
export interface PaymentRequestView {
  id: string
  status: PaymentRequestStatus
  result: SendPaymentResult | null
  error: string | null
}

// Written by the website's side only, and under its own key, so that it never
// races the backend's writes to the request itself.
export type PaymentCancellationReason = 'closed' | 'expired' | 'contextChanged'

export interface PaymentCancellation {
  reason: PaymentCancellationReason
  cancelledAt: number
}

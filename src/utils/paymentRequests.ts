import {
  PaymentAddressType,
  PaymentCancellation,
  PaymentCancellationReason,
  PaymentRequest,
  PaymentRequestView,
  PaymentSourceType
} from '../types/PaymentRequest'
import { PaymentRequestStatus } from '../types/enums/PaymentRequestStatus'
import { CORE_DUST_THRESHOLD, MAX_PAYMENT_DUFFS, PAYMENT_REQUEST_TTL_MS } from '../constants'

// The (source, recipient) pairs a payment request can be paid by. The website
// side refuses a recipient no source reaches before it opens any window, and
// the backend's router serves exactly these.
export const PAYMENT_ROUTES: ReadonlyArray<{ source: PaymentSourceType, recipient: PaymentAddressType }> = [
  { source: 'core', recipient: 'core' }
]

export const paymentSourcesFor = (recipient: PaymentAddressType): PaymentSourceType[] =>
  PAYMENT_ROUTES.filter(route => route.recipient === recipient).map(route => route.source)

const CANCELLATION_MESSAGES: Record<PaymentCancellationReason, string> = {
  closed: 'Payment was rejected: the confirmation window was closed',
  expired: 'Payment request expired before it was confirmed',
  contextChanged: 'Payment request was cancelled because the wallet or network changed'
}

export const paymentCancellationMessage = (reason: PaymentCancellationReason): string => CANCELLATION_MESSAGES[reason]

// A request the website cancelled is rejected as soon as the cancellation is
// written, whatever the stored status still says - unless the user confirmed it
// first, which the backend settles (see APPROVE_PAYMENT_REQUEST).
export const applyPaymentCancellation = (request: PaymentRequest, cancellation: PaymentCancellation | null): PaymentRequest => {
  if (cancellation == null || request.status !== PaymentRequestStatus.pending) {
    return request
  }

  return { ...request, status: PaymentRequestStatus.rejected, error: paymentCancellationMessage(cancellation.reason) }
}

export const isPaymentRequestExpired = (request: PaymentRequest, now: number): boolean =>
  now - request.createdAt > PAYMENT_REQUEST_TTL_MS

// Only what the website needs to learn the outcome: no source, fee, inputs or
// transaction bytes.
export const toPaymentRequestView = (request: PaymentRequest): PaymentRequestView => ({
  id: request.id,
  status: request.status,
  result: request.status === PaymentRequestStatus.completed ? request.result : null,
  error: request.status === PaymentRequestStatus.completed ? null : request.error
})

// A positive whole number of duffs, written without leading zeros, that a
// payment to an address of this type can carry.
export const validatePaymentAmount = (amountDuffs: unknown, recipient?: PaymentAddressType): string | null => {
  if (typeof amountDuffs !== 'string' || !/^[1-9]\d*$/.test(amountDuffs)) {
    return 'amountDuffs must be a positive integer string of duffs'
  }

  const amount = BigInt(amountDuffs)

  if (amount > MAX_PAYMENT_DUFFS) {
    return `amountDuffs must not exceed ${MAX_PAYMENT_DUFFS.toString()} duffs`
  }

  // Whichever source pays it, a Core recipient is paid by a Core output, and an
  // output this small is non-standard: no node would relay it.
  if (recipient === 'core' && amount <= CORE_DUST_THRESHOLD) {
    return `A payment to a Core address must be greater than ${CORE_DUST_THRESHOLD.toString()} duffs`
  }

  return null
}

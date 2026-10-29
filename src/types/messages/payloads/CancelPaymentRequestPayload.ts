export interface CancelPaymentRequestPayload {
  id: string
  // Why the website stopped waiting: the user closed the confirmation window,
  // or the request ran out of time.
  reason: 'closed' | 'expired'
}

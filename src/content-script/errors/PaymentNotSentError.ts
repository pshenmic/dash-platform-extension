// A payment that can never reach the network: nothing it signed will ever
// confirm, so nothing was paid and the request has failed for good. Any other
// error after signing leaves the outcome open, and the request stays where a
// repeat can finish it.
export class PaymentNotSentError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'PaymentNotSentError'
  }
}

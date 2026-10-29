export enum PaymentRequestStatus {
  // Waiting for the user to confirm or reject it.
  pending = 'pending',
  // Confirmed, and the payment is being made. Nothing may confirm it again.
  processing = 'processing',
  // Paid: the result is set.
  completed = 'completed',
  // Declined by the user, cancelled by the website, or dropped because the
  // wallet or network changed or it expired. Nothing was paid.
  rejected = 'rejected',
  // Could not be paid, and nothing it signed can ever reach the network.
  failed = 'failed',
}

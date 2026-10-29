import { PaymentSourceType } from '../../PaymentRequest'

export interface ApprovePaymentRequestPayload {
  id: string
  source: PaymentSourceType
  // The fee the user was shown and agreed to, in duffs. A payment that would
  // cost more is stopped before it is sent.
  confirmedFeeDuffs: string
  // Needed to sign. Not needed to finish a payment an earlier attempt already
  // signed, and never stored.
  password?: string
}

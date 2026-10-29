import { PaymentSourceType } from '../../PaymentRequest'

export interface EstimatePaymentRequestResponse {
  source: PaymentSourceType
  // All amounts in duffs, as strings.
  // What the recipient receives: the amount the website asked for.
  amountDuffs: string
  // Everything the payment costs on top of that.
  feeDuffs: string
  // What leaves the source: amount plus fee.
  totalDuffs: string
}

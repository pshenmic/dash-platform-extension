import { PaymentSourceType } from '../../PaymentRequest'

export interface EstimatePaymentRequestPayload {
  id: string
  source: PaymentSourceType
}

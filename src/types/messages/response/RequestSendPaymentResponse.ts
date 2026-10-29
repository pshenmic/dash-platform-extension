import { PaymentRequestView } from '../../PaymentRequest'

export interface RequestSendPaymentResponse extends PaymentRequestView {
  // The extension page where the user confirms or rejects this request.
  redirectUrl: string
}

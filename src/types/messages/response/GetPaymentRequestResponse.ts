import { PaymentRequest, PaymentSourceType } from '../../PaymentRequest'

export interface GetPaymentRequestResponse {
  request: PaymentRequest
  // The sources this request's recipient can be paid from.
  sources: PaymentSourceType[]
  // True when the wallet or network the request was made against is no longer
  // the current one: it can no longer be confirmed.
  contextChanged: boolean
}

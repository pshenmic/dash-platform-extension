import { APIHandler } from '../../APIHandler'
import { EventData } from '../../../../types/EventData'
import { PaymentRequestsRepository } from '../../../repository/PaymentRequestsRepository'
import { RejectPaymentRequestPayload } from '../../../../types/messages/payloads/RejectPaymentRequestPayload'
import { PaymentRequestResponse } from '../../../../types/messages/response/PaymentRequestResponse'
import { PaymentRequestStatus } from '../../../../types/enums/PaymentRequestStatus'

// The user declines a website's payment request. Taken under the request's
// lock, so it cannot slip in while a confirmation of the same request is
// running, and refused once anything of the payment has been signed: from then
// on it may already be on the network.
export class RejectPaymentRequestHandler implements APIHandler {
  paymentRequestsRepository: PaymentRequestsRepository

  constructor (paymentRequestsRepository: PaymentRequestsRepository) {
    this.paymentRequestsRepository = paymentRequestsRepository
  }

  async handle (event: EventData): Promise<PaymentRequestResponse> {
    const payload: RejectPaymentRequestPayload = event.payload

    return await this.paymentRequestsRepository.withLock(payload.id, async () => {
      const request = await this.paymentRequestsRepository.getById(payload.id)

      if (request == null) {
        throw new Error(`Payment request ${payload.id} not found`)
      }

      if (request.status === PaymentRequestStatus.rejected) {
        return { request }
      }

      const unsigned = request.status === PaymentRequestStatus.pending ||
        (request.status === PaymentRequestStatus.processing && request.transactions.length === 0)

      if (!unsigned) {
        throw new Error(`Payment request ${request.id} is ${request.status} and can no longer be rejected`)
      }

      const rejected = { ...request, status: PaymentRequestStatus.rejected, error: 'Payment was rejected by the user' }

      await this.paymentRequestsRepository.save(rejected)

      return { request: rejected }
    })
  }

  validatePayload (payload: RejectPaymentRequestPayload): string | null {
    if (typeof payload?.id !== 'string' || payload.id.length === 0) {
      return 'id must be a non-empty string'
    }

    return null
  }
}

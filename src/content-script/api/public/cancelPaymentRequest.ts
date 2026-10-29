import { EventData } from '../../../types/EventData'
import { PublicAPIContext, PublicAPIHandler } from '../PublicAPIHandler'
import { PaymentRequestsRepository } from '../../repository/PaymentRequestsRepository'
import { CancelPaymentRequestPayload } from '../../../types/messages/payloads/CancelPaymentRequestPayload'
import { PaymentRequest, PaymentRequestView } from '../../../types/PaymentRequest'
import { applyPaymentCancellation, toPaymentRequestView } from '../../../utils/paymentRequests'

const REASONS = ['closed', 'expired']

// A website stops waiting for its payment request: the user closed the
// confirmation window, or the request ran out of time.
//
// It cannot take back a payment the user already confirmed. The cancellation is
// written under its own key and the request is read after it, while the backend
// writes its confirmation first and reads the cancellation after - so either the
// backend sees the cancellation and stops before signing anything, or this sees
// the confirmation and the website keeps waiting for the result.
export class CancelPaymentRequestHandler implements PublicAPIHandler {
  paymentRequestsRepository: PaymentRequestsRepository

  constructor (paymentRequestsRepository: PaymentRequestsRepository) {
    this.paymentRequestsRepository = paymentRequestsRepository
  }

  async handle (event: EventData, context: PublicAPIContext): Promise<PaymentRequestView> {
    const payload: CancelPaymentRequestPayload = event.payload
    const request = await this.paymentRequestsRepository.getById(payload.id)

    if (request == null || request.origin !== context.origin) {
      throw new Error(`Payment request ${payload.id} not found`)
    }

    // The first reason given is the one the request was cancelled for.
    if (await this.paymentRequestsRepository.getCancellation(request.id) == null) {
      await this.paymentRequestsRepository.setCancellation(request.id, { reason: payload.reason, cancelledAt: Date.now() })
    }

    const current = await this.paymentRequestsRepository.getById(request.id) as PaymentRequest
    const cancellation = await this.paymentRequestsRepository.getCancellation(request.id)

    return toPaymentRequestView(applyPaymentCancellation(current, cancellation))
  }

  validatePayload (payload: CancelPaymentRequestPayload): null | string {
    if (typeof payload?.id !== 'string' || payload.id.length === 0) {
      return 'id must be a non-empty string'
    }

    if (!REASONS.includes(payload.reason)) {
      return `reason must be one of ${REASONS.join(', ')}`
    }

    return null
  }
}

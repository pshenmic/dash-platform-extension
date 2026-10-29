import { APIHandler } from '../../APIHandler'
import { EventData } from '../../../../types/EventData'
import { PaymentRequestsRepository } from '../../../repository/PaymentRequestsRepository'
import { WalletRepository } from '../../../repository/WalletRepository'
import { GetPaymentRequestPayload } from '../../../../types/messages/payloads/GetPaymentRequestPayload'
import { GetPaymentRequestResponse } from '../../../../types/messages/response/GetPaymentRequestResponse'
import { applyPaymentCancellation, paymentSourcesFor } from '../../../../utils/paymentRequests'

// A website's payment request as the confirmation page shows it: what the
// website asked for, where it stands, and what it can be paid from. Read only -
// it changes nothing about the request.
export class GetPaymentRequestHandler implements APIHandler {
  paymentRequestsRepository: PaymentRequestsRepository
  walletRepository: WalletRepository

  constructor (paymentRequestsRepository: PaymentRequestsRepository, walletRepository: WalletRepository) {
    this.paymentRequestsRepository = paymentRequestsRepository
    this.walletRepository = walletRepository
  }

  async handle (event: EventData): Promise<GetPaymentRequestResponse> {
    const payload: GetPaymentRequestPayload = event.payload
    const request = await this.paymentRequestsRepository.getById(payload.id)

    if (request == null) {
      throw new Error(`Payment request ${payload.id} not found`)
    }

    const cancellation = await this.paymentRequestsRepository.getCancellation(request.id)
    const wallet = await this.walletRepository.getCurrent()

    return {
      request: applyPaymentCancellation(request, cancellation),
      sources: paymentSourcesFor(request.addressType),
      contextChanged: wallet?.walletId !== request.walletId || wallet.network !== request.network
    }
  }

  validatePayload (payload: GetPaymentRequestPayload): string | null {
    if (typeof payload?.id !== 'string' || payload.id.length === 0) {
      return 'id must be a non-empty string'
    }

    return null
  }
}

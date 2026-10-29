import { EventData } from '../../../types/EventData'
import { PublicAPIContext, PublicAPIHandler } from '../PublicAPIHandler'
import { PaymentRequestsRepository } from '../../repository/PaymentRequestsRepository'
import { WalletRepository } from '../../repository/WalletRepository'
import { GetPaymentStatusPayload } from '../../../types/messages/payloads/GetPaymentStatusPayload'
import { PaymentRequest, PaymentRequestView } from '../../../types/PaymentRequest'
import { PaymentRequestStatus } from '../../../types/enums/PaymentRequestStatus'
import { applyPaymentCancellation, toPaymentRequestView } from '../../../utils/paymentRequests'

// Where a website's payment request stands, as far as the website may know.
//
// Answered for the origin that made the request whatever wallet or network is
// current now: a payment keeps the context it was made in, and the website has
// to be able to follow it to the end after the user switches either.
export class GetPaymentStatusHandler implements PublicAPIHandler {
  paymentRequestsRepository: PaymentRequestsRepository
  walletRepository: WalletRepository

  constructor (paymentRequestsRepository: PaymentRequestsRepository, walletRepository: WalletRepository) {
    this.paymentRequestsRepository = paymentRequestsRepository
    this.walletRepository = walletRepository
  }

  async handle (event: EventData, context: PublicAPIContext): Promise<PaymentRequestView> {
    const payload: GetPaymentStatusPayload = event.payload
    const request = await this.paymentRequestsRepository.getById(payload.id)

    if (request == null || request.origin !== context.origin) {
      throw new Error(`Payment request ${payload.id} not found`)
    }

    // A request the user has not confirmed yet belongs to the wallet and
    // network it was made against: once either changes, it is cancelled. If
    // the user confirmed it in the meantime, the cancellation loses and the
    // request reads as processing.
    if (request.status === PaymentRequestStatus.pending && await this.isContextChanged(request)) {
      if (await this.paymentRequestsRepository.getCancellation(request.id) == null) {
        await this.paymentRequestsRepository.setCancellation(request.id, { reason: 'contextChanged', cancelledAt: Date.now() })
      }
    }

    // Read after the cancellation is written, never before: the backend writes
    // its confirmation before it reads the cancellation, so one of the two
    // always sees the other.
    const current = await this.paymentRequestsRepository.getById(request.id) as PaymentRequest
    const cancellation = await this.paymentRequestsRepository.getCancellation(request.id)

    return toPaymentRequestView(applyPaymentCancellation(current, cancellation))
  }

  private async isContextChanged (request: PaymentRequest): Promise<boolean> {
    const wallet = await this.walletRepository.getCurrent()

    return wallet?.walletId !== request.walletId || wallet.network !== request.network
  }

  validatePayload (payload: GetPaymentStatusPayload): null | string {
    if (typeof payload?.id !== 'string' || payload.id.length === 0) {
      return 'id must be a non-empty string'
    }

    return null
  }
}

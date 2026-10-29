import { APIHandler } from '../../APIHandler'
import { EventData } from '../../../../types/EventData'
import { PaymentRequestsRepository } from '../../../repository/PaymentRequestsRepository'
import { WalletRepository } from '../../../repository/WalletRepository'
import { PaymentRouter } from './PaymentRouter'
import { EstimatePaymentRequestPayload } from '../../../../types/messages/payloads/EstimatePaymentRequestPayload'
import { EstimatePaymentRequestResponse } from '../../../../types/messages/response/EstimatePaymentRequestResponse'
import { PaymentRequestStatus } from '../../../../types/enums/PaymentRequestStatus'
import { applyPaymentCancellation } from '../../../../utils/paymentRequests'

const SOURCES = ['core', 'platform', 'orchard']

// What paying a website's request from one source would cost, with nothing
// signed: the fee on top of the requested amount and the total that leaves the
// source. The fee shown here is the one the user confirms, and a payment that
// would cost more is stopped before it is sent. Needs no password.
export class EstimatePaymentRequestHandler implements APIHandler {
  paymentRequestsRepository: PaymentRequestsRepository
  walletRepository: WalletRepository
  router: PaymentRouter

  constructor (paymentRequestsRepository: PaymentRequestsRepository, walletRepository: WalletRepository, router: PaymentRouter) {
    this.paymentRequestsRepository = paymentRequestsRepository
    this.walletRepository = walletRepository
    this.router = router
  }

  async handle (event: EventData): Promise<EstimatePaymentRequestResponse> {
    const payload: EstimatePaymentRequestPayload = event.payload
    const stored = await this.paymentRequestsRepository.getById(payload.id)

    if (stored == null) {
      throw new Error(`Payment request ${payload.id} not found`)
    }

    // One the website cancelled is not the user's to pay any more.
    const request = applyPaymentCancellation(stored, await this.paymentRequestsRepository.getCancellation(stored.id))

    if (request.status !== PaymentRequestStatus.pending) {
      throw new Error(`Payment request ${request.id} is ${request.status} and can no longer be priced`)
    }

    const current = await this.walletRepository.getCurrent()

    if (current?.walletId !== request.walletId || current.network !== request.network) {
      throw new Error('The wallet or network changed after the website asked: this request can no longer be paid')
    }

    const route = this.router.get(payload.source, request.addressType)
    const walletRepository = this.walletRepository.forScope({ network: request.network, walletId: request.walletId })
    const quote = await route.quote(request, { wallet: current, walletRepository })

    return {
      source: payload.source,
      amountDuffs: quote.amountDuffs.toString(),
      feeDuffs: quote.feeDuffs.toString(),
      totalDuffs: (quote.amountDuffs + quote.feeDuffs).toString()
    }
  }

  validatePayload (payload: EstimatePaymentRequestPayload): string | null {
    if (typeof payload?.id !== 'string' || payload.id.length === 0) {
      return 'id must be a non-empty string'
    }

    if (!SOURCES.includes(payload.source)) {
      return `source must be one of ${SOURCES.join(', ')}`
    }

    return null
  }
}

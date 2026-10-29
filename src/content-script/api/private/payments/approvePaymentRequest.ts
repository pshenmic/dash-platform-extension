import { APIHandler } from '../../APIHandler'
import { EventData } from '../../../../types/EventData'
import { PaymentRequestsRepository } from '../../../repository/PaymentRequestsRepository'
import { WalletRepository } from '../../../repository/WalletRepository'
import { PaymentRouter } from './PaymentRouter'
import { PaymentRoute, PaymentRouteContext } from './PaymentRoute'
import { ApprovePaymentRequestPayload } from '../../../../types/messages/payloads/ApprovePaymentRequestPayload'
import { PaymentRequestResponse } from '../../../../types/messages/response/PaymentRequestResponse'
import { PaymentRequest } from '../../../../types/PaymentRequest'
import { PaymentRequestStatus } from '../../../../types/enums/PaymentRequestStatus'
import { PaymentNotSentError } from '../../../errors/PaymentNotSentError'
import { decryptMnemonic } from '../../../../utils'
import { isPaymentRequestExpired, paymentCancellationMessage } from '../../../../utils/paymentRequests'

const SOURCES = ['core', 'platform', 'orchard']

// The user confirms a website's payment request, and the payment is made.
//
// Everything happens holding the request's lock, so a second confirmation of
// the same request - a double click, a repeated message - is refused rather than
// run. The request is marked processing before anything is signed, the signed
// transactions are written into it before any of them is sent, and sending them
// again is all a repeat does once they are there: a reply lost on the way back,
// or a backend that died halfway, never pays twice. The password is used to
// sign and is never stored.
export class ApprovePaymentRequestHandler implements APIHandler {
  paymentRequestsRepository: PaymentRequestsRepository
  walletRepository: WalletRepository
  router: PaymentRouter

  constructor (paymentRequestsRepository: PaymentRequestsRepository, walletRepository: WalletRepository, router: PaymentRouter) {
    this.paymentRequestsRepository = paymentRequestsRepository
    this.walletRepository = walletRepository
    this.router = router
  }

  async handle (event: EventData): Promise<PaymentRequestResponse> {
    const payload: ApprovePaymentRequestPayload = event.payload

    return await this.paymentRequestsRepository.withLock(payload.id, async () => {
      const request = await this.paymentRequestsRepository.getById(payload.id)

      if (request == null) {
        throw new Error(`Payment request ${payload.id} not found`)
      }

      // Asked again after the payment went through: the answer is the result.
      if (request.status === PaymentRequestStatus.completed) {
        return { request }
      }

      if (request.status === PaymentRequestStatus.rejected || request.status === PaymentRequestStatus.failed) {
        throw new Error(request.error ?? `Payment request ${request.id} is ${request.status}`)
      }

      const contextChanged = await this.isContextChanged(request)

      // Signed by an earlier attempt that did not finish: send the same
      // transactions, on the network and from the wallet they were signed for.
      if (request.status === PaymentRequestStatus.processing && request.transactions.length > 0) {
        if (contextChanged) {
          throw new Error(`This payment was signed on ${request.network} by wallet ${request.walletId}: switch back to them to finish it`)
        }

        const route = this.router.get(request.source ?? payload.source, request.addressType)

        return { request: await this.send(route, request, await this.loadContext(request)) }
      }

      // Pending, or processing by an attempt that died before it signed
      // anything - nothing of it can be on the network, so it is confirmed anew.
      if (contextChanged) {
        throw await this.reject(request, paymentCancellationMessage('contextChanged'))
      }

      if (isPaymentRequestExpired(request, Date.now())) {
        throw await this.reject(request, paymentCancellationMessage('expired'))
      }

      const route = this.router.get(payload.source, request.addressType)
      const context = await this.loadContext(request)

      if (payload.password == null || payload.password.length === 0) {
        throw new Error('Password is required to confirm the payment')
      }

      try {
        decryptMnemonic(context.wallet, payload.password)
      } catch {
        throw new Error('Invalid password')
      }

      let claimed: PaymentRequest = {
        ...request,
        status: PaymentRequestStatus.processing,
        source: payload.source,
        feeDuffs: payload.confirmedFeeDuffs,
        transactions: [],
        error: null
      }

      await this.paymentRequestsRepository.save(claimed)

      // The website may have cancelled while the user was confirming. It writes
      // its cancellation first and reads the request after; this writes the
      // request first and reads the cancellation after - so at least one of the
      // two sees the other, and a cancelled request is never paid.
      const cancellation = await this.paymentRequestsRepository.getCancellation(request.id)

      if (cancellation != null) {
        throw await this.reject(claimed, paymentCancellationMessage(cancellation.reason))
      }

      try {
        const prepared = await route.prepare(claimed, context, payload.password)

        // The user agreed to the fee they were shown. One that rose since is a
        // different payment, and goes back to them before anything is sent.
        if (prepared.feeDuffs > BigInt(payload.confirmedFeeDuffs)) {
          throw new Error(
            `The fee is now ${prepared.feeDuffs.toString()} duffs, more than the ${payload.confirmedFeeDuffs} duffs confirmed. ` +
            'Review the payment and confirm it again'
          )
        }

        claimed = { ...claimed, feeDuffs: prepared.feeDuffs.toString(), transactions: prepared.transactions }
      } catch (e) {
        // Nothing reached the network: the request goes back to the user, who
        // may try again or reject it.
        await this.paymentRequestsRepository.save({
          ...request,
          status: PaymentRequestStatus.pending,
          source: null,
          feeDuffs: null,
          transactions: [],
          error: e.message
        })

        throw e
      }

      // Written before any of it reaches the network: from here on a repeat
      // sends these very transactions rather than signing new ones.
      await this.paymentRequestsRepository.save(claimed)

      return { request: await this.send(route, claimed, context) }
    })
  }

  private async send (route: PaymentRoute, request: PaymentRequest, context: PaymentRouteContext): Promise<PaymentRequest> {
    try {
      const outcome = await route.send(request, context)

      const completed: PaymentRequest = {
        ...request,
        status: PaymentRequestStatus.completed,
        result: {
          id: request.id,
          address: request.address,
          amountDuffs: request.amountDuffs,
          delivery: outcome.delivery,
          transactions: outcome.transactions
        },
        error: null
      }

      await this.paymentRequestsRepository.save(completed)

      return completed
    } catch (e) {
      // Never paid and never will be: that is final. Anything else may still
      // have reached the network, so the request stays processing, where a
      // repeat sends the same transactions again.
      await this.paymentRequestsRepository.save({
        ...request,
        status: e instanceof PaymentNotSentError ? PaymentRequestStatus.failed : PaymentRequestStatus.processing,
        error: e.message
      })

      throw e
    }
  }

  private async reject (request: PaymentRequest, error: string): Promise<Error> {
    await this.paymentRequestsRepository.save({ ...request, status: PaymentRequestStatus.rejected, error })

    return new Error(error)
  }

  private async isContextChanged (request: PaymentRequest): Promise<boolean> {
    const wallet = await this.walletRepository.getCurrent()

    return wallet?.walletId !== request.walletId || wallet.network !== request.network
  }

  // The request's own wallet, read through its own scope so that nothing the
  // payment touches follows a wallet or network switch.
  private async loadContext (request: PaymentRequest): Promise<PaymentRouteContext> {
    const walletRepository = this.walletRepository.forScope({ network: request.network, walletId: request.walletId })
    const wallet = await walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error(`Wallet ${request.walletId} of this payment request no longer exists`)
    }

    return { wallet, walletRepository }
  }

  validatePayload (payload: ApprovePaymentRequestPayload): string | null {
    if (typeof payload?.id !== 'string' || payload.id.length === 0) {
      return 'id must be a non-empty string'
    }

    if (!SOURCES.includes(payload.source)) {
      return `source must be one of ${SOURCES.join(', ')}`
    }

    if (typeof payload.confirmedFeeDuffs !== 'string' || !/^\d+$/.test(payload.confirmedFeeDuffs)) {
      return 'confirmedFeeDuffs must be an integer string of duffs'
    }

    if (payload.password != null && typeof payload.password !== 'string') {
      return 'password must be a string'
    }

    return null
  }
}

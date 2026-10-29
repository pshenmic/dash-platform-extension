import { EventData } from '../../../types/EventData'
import { PublicAPIContext, PublicAPIHandler } from '../PublicAPIHandler'
import { PaymentRequestsRepository } from '../../repository/PaymentRequestsRepository'
import { OpenRequestPopupPayload } from '../../../types/messages/payloads/OpenRequestPopupPayload'
import { OpenRequestPopupResponse } from '../../../types/messages/response/OpenRequestPopupResponse'
import { RequestWindow, requestWindowPath } from '../../../types/RequestWindow'
import { AppConnectStatus } from '../../../types/enums/AppConnectStatus'
import { PaymentRequestStatus } from '../../../types/enums/PaymentRequestStatus'
import { applyPaymentCancellation } from '../../../utils/paymentRequests'

// A website asks the extension to show the user one of its own requests that
// is waiting for an answer, in the toolbar popup. Only its own and only a
// pending one: a website cannot open the extension on anything else.
export class OpenRequestPopupHandler implements PublicAPIHandler {
  paymentRequestsRepository: PaymentRequestsRepository
  // Opens the toolbar popup on a page; false when the browser would not.
  openPopup: (path: string) => Promise<boolean>

  constructor (paymentRequestsRepository: PaymentRequestsRepository, openPopup: (path: string) => Promise<boolean>) {
    this.paymentRequestsRepository = paymentRequestsRepository
    this.openPopup = openPopup
  }

  async handle (event: EventData, context: PublicAPIContext): Promise<OpenRequestPopupResponse> {
    const payload: OpenRequestPopupPayload = event.payload
    const window = payload.kind === 'connect'
      ? this.connectWindow(context)
      : await this.paymentWindow(payload.id, context)

    return { opened: await this.openPopup(requestWindowPath(window)) }
  }

  private connectWindow (context: PublicAPIContext): RequestWindow {
    if (context.appConnect?.status !== AppConnectStatus.pending) {
      throw new Error(`No connection request of ${context.origin} is waiting for the user`)
    }

    return { kind: 'connect', id: context.appConnect.id }
  }

  private async paymentWindow (id: string, context: PublicAPIContext): Promise<RequestWindow> {
    const stored = await this.paymentRequestsRepository.getById(id)

    if (stored == null || stored.origin !== context.origin) {
      throw new Error(`Payment request ${id} not found`)
    }

    const request = applyPaymentCancellation(stored, await this.paymentRequestsRepository.getCancellation(id))

    if (request.status !== PaymentRequestStatus.pending) {
      throw new Error(`Payment request ${id} is ${request.status}`)
    }

    return { kind: 'payment', id }
  }

  validatePayload (payload: OpenRequestPopupPayload): null | string {
    if (payload?.kind === 'connect') {
      return null
    }

    if (payload?.kind === 'payment') {
      return typeof payload.id === 'string' && /^[0-9a-f]+$/.test(payload.id) ? null : 'id must be a hex string'
    }

    return 'kind must be connect or payment'
  }
}

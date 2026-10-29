import { MESSAGING_TIMEOUT } from '../constants'
import { EventData } from './EventData'
import { MessagingMethods } from './enums/MessagingMethods'
import { ConnectAppResponse } from './messages/response/ConnectAppResponse'
import { RequestStateTransitionApprovalResponse } from './messages/response/RequestStateTransitionApprovalResponse'
import { RequestSendPaymentResponse } from './messages/response/RequestSendPaymentResponse'
import { RequestSendPaymentPayload } from './messages/payloads/RequestSendPaymentPayload'
import { GetPaymentStatusPayload } from './messages/payloads/GetPaymentStatusPayload'
import { CancelPaymentRequestPayload } from './messages/payloads/CancelPaymentRequestPayload'
import { PaymentRequestView } from './PaymentRequest'
import { ConnectAppPayload } from './messages/payloads/ConnectAppPayload'
import { OpenRequestPopupPayload } from './messages/payloads/OpenRequestPopupPayload'
import { OpenRequestPopupResponse } from './messages/response/OpenRequestPopupResponse'
import { generateRandomHex } from '../utils'

export class PublicAPIClient {
  async connectApp (url: string, waiting?: boolean): Promise<ConnectAppResponse> {
    const payload: ConnectAppPayload = { url, waiting }

    return await this._rpcCall(MessagingMethods.CONNECT_APP, payload)
  }

  async openRequestPopup (request: OpenRequestPopupPayload): Promise<OpenRequestPopupResponse> {
    return await this._rpcCall(MessagingMethods.OPEN_REQUEST_POPUP, request)
  }

  async requestTransactionApproval (base64: string): Promise<RequestStateTransitionApprovalResponse> {
    return await this._rpcCall(MessagingMethods.REQUEST_STATE_TRANSITION_APPROVAL,
      {
        base64
      })
  }

  async requestSendPayment (address: string, amountDuffs: string): Promise<RequestSendPaymentResponse> {
    const payload: RequestSendPaymentPayload = { address, amountDuffs }

    return await this._rpcCall(MessagingMethods.REQUEST_SEND_PAYMENT, payload)
  }

  async getPaymentStatus (id: string): Promise<PaymentRequestView> {
    const payload: GetPaymentStatusPayload = { id }

    return await this._rpcCall(MessagingMethods.GET_PAYMENT_STATUS, payload)
  }

  async cancelPaymentRequest (id: string, reason: CancelPaymentRequestPayload['reason']): Promise<PaymentRequestView> {
    const payload: CancelPaymentRequestPayload = { id, reason }

    return await this._rpcCall(MessagingMethods.CANCEL_PAYMENT_REQUEST, payload)
  }

  async _rpcCall<T>(method: string, payload?: object): Promise<T> {
    const id = generateRandomHex(8)

    return await new Promise((resolve, reject) => {
      const rejectWithError = (message: string): void => {
        window.removeEventListener('message', handleMessage)

        reject(message)
      }

      const handleMessage = (event: MessageEvent): void => {
        const data: EventData = event.data

        if (data.type === 'response' && data.id === id) {
          if (data.error != null) {
            return rejectWithError(data.error)
          }

          window.removeEventListener('message', handleMessage)

          resolve(data.payload)
        }
      }

      window.addEventListener('message', handleMessage)

      setTimeout(() => {
        rejectWithError(`Timed out waiting for response of ${method}`)
      }, MESSAGING_TIMEOUT)

      const message: EventData = {
        context: 'dash-platform-extension',
        id,
        method,
        payload,
        type: 'request'
      }

      window.postMessage(message)
    })
  }
}

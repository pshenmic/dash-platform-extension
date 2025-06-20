import { MESSAGING_TIMEOUT } from '../constants'
import { EventData } from './EventData'
import { MessagingMethods } from './enums/MessagingMethods'
import { ConnectAppResponse } from './messages/response/ConnectAppResponse'
import { RequestStateTransitionApprovalResponse } from './messages/response/RequestStateTransitionApprovalResponse'

export class PublicAPIClient {
  async connectApp (url: string): Promise<ConnectAppResponse> {
    return await this._rpcCall(MessagingMethods.CONNECT_APP,
      {
        url
      })
  }

  async requestTransactionApproval (base64: string): Promise<RequestStateTransitionApprovalResponse> {
    return await this._rpcCall(MessagingMethods.REQUEST_STATE_TRANSITION_APPROVAL,
      {
        base64
      })
  }

  async _rpcCall<T>(method: string, payload?: object): Promise<T> {
    const id = new Date().getTime().toString()

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

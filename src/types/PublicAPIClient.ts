import { MESSAGING_TIMEOUT } from '../constants'
import { EventData } from './EventData'
import { MessagingMethods } from './enums/MessagingMethods'
import { ConnectAppResponse } from './messages/response/ConnectAppResponse'
import { RequestStateTransitionApprovalResponse } from './messages/response/RequestStateTransitionApprovalResponse'
import { GetStateTransitionResponse } from './messages/response/GetStateTransitionResponse'
import { GetCurrentIdentityResponse } from './messages/response/GetCurrentIdentityResponse'
import { IdentifierWASM } from 'pshenmic-dpp'
import { CreateIdentityPayload } from './messages/payloads/CreateIdentityPayload'
import { GetAvailableIdentitiesResponse } from './messages/response/GetAvailableIdentitiesResponse'

export class PublicAPIClient {
  async connectApp (url: string): Promise<ConnectAppResponse> {
    return await this._rpcCall(MessagingMethods.REQUEST_STATE_TRANSITION_APPROVAL,
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
    console.log(`RPC call to extension with method ${method} payload ${JSON.stringify(payload)}`)
    const id = new Date().getTime() + ''

    return await new Promise((resolve, reject) => {
      const rejectWithError = (message: string) => {
        window.removeEventListener('message', handleMessage)

        reject(message)
      }

      const handleMessage = (event: MessageEvent) => {
        const data: EventData = event.data

        if (data.type === 'response' && data.id === id) {
          if (data.error) {
            return rejectWithError(data.error)
          }

          window.removeEventListener('message', handleMessage)

          resolve(data.payload)
        }
      }

      window.addEventListener('message', handleMessage)

      setTimeout(() => {
        rejectWithError(`Timed out waiting for response of ${method}, (${payload})`)
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

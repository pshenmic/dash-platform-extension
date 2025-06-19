import { MESSAGING_TIMEOUT } from '../constants'
import { EventData } from './EventData'
import { MessagingMethods } from './enums/MessagingMethods'
import { GetStateTransitionResponse } from './messages/response/GetStateTransitionResponse'
import { GetCurrentIdentityResponse } from './messages/response/GetCurrentIdentityResponse'
import { GetStatusResponse } from './messages/response/GetStatusResponse'
import { SetupPasswordPayload } from './messages/payloads/SetupPasswordPayload'
import { VoidResponse } from './messages/response/VoidResponse'
import { SwitchIdentityPayload } from './messages/payloads/SwitchIdentityPayload'
import { EmptyPayload } from './messages/payloads/EmptyPayload'
import { CheckPasswordResponse } from './messages/response/CheckPasswordResponse'
import { CheckPasswordPayload } from './messages/payloads/CheckPasswordPayload'
import { CreateWalletPayload } from './messages/payloads/CreateWalletPayload'
import { CreateIdentityPayload } from './messages/payloads/CreateIdentityPayload'
import { GetStateTransitionPayload } from './messages/payloads/GetStateTransitionPayload'
import { GetAvailableIdentitiesResponse } from './messages/response/GetAvailableIdentitiesResponse'

export class PrivateAPIClient {
  constructor () {
    if (!chrome.runtime.onMessage) {
      throw new Error('PrivateAPIClient could only be used inside extension context')
    }
  }

  async getStatus (): Promise<GetStatusResponse> {
    const payload: EmptyPayload = {}

    return await this._rpcCall(MessagingMethods.CREATE_WALLET, payload)
  }

  async setupPassword (password: string): Promise<void> {
    const payload: SetupPasswordPayload = {
      password
    }

    await this._rpcCall(MessagingMethods.SETUP_PASSWORD, payload)

    return null
  }

  async checkPassword (password: string): Promise<CheckPasswordResponse> {
    const payload: CheckPasswordPayload = {
      password
    }

    return await this._rpcCall(MessagingMethods.CHECK_PASSWORD, payload)
  }

  async createWallet (walletType: string): Promise<void> {
    const payload: CreateWalletPayload = { walletType }

    await this._rpcCall(MessagingMethods.CREATE_WALLET, payload)

    return null
  }

  async createIdentity (identifier: string, privateKeys?: string[]): Promise<void> {
    const payload: CreateIdentityPayload = {
      identifier,
      privateKeys
    }

    return await this._rpcCall(MessagingMethods.CREATE_IDENTITY, payload)
  }

  async getStateTransition (hash: string): Promise<GetStateTransitionResponse> {
    const payload: GetStateTransitionPayload = {
      hash
    }

    return await this._rpcCall(MessagingMethods.GET_STATE_TRANSITION, payload)
  }

  async getCurrentIdentity (): Promise<string> {
    const payload: EmptyPayload = {}

    const { currentIdentity }: GetCurrentIdentityResponse = await this._rpcCall(MessagingMethods.GET_CURRENT_IDENTITY, payload)

    return currentIdentity
  }

  async switchIdentity (identifier: string): Promise<VoidResponse> {
    const payload: SwitchIdentityPayload = {
      identity: identifier
    }

    return await this._rpcCall(MessagingMethods.SWITCH_IDENTITY, payload)
  }

  async getAvailableIdentities (): Promise<string[]> {
    const payload: EmptyPayload = {}

    const response: GetAvailableIdentitiesResponse = await this._rpcCall(MessagingMethods.GET_AVAILABLE_IDENTITIES, payload)

    return response.identities
  }

  async _rpcCall<T>(method: string, payload?: object): Promise<T> {
    console.log(`RPC call to extension with method ${method} payload ${JSON.stringify(payload)}`)
    const id = new Date().getTime() + ''

    return await new Promise((resolve, reject) => {
      const rejectWithError = (message: string) => {
        chrome.runtime.onMessage.removeListener(handleMessage)

        reject(message)
      }

      const handleMessage = (data: EventData) => {
        if (data.type === 'response' && data.id === id) {
          if (data.error) {
            return rejectWithError(data.error)
          }

          chrome.runtime.onMessage.removeListener(handleMessage)

          resolve(data.payload)
        }
      }

      chrome.runtime.onMessage.addListener(handleMessage)

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

      // @ts-expect-error
      chrome.runtime.onMessage.dispatch(message)
    })
  }
}

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
import { CreateWalletResponse } from './messages/response/CreateWalletResponse'
import { SwitchWalletPayload } from './messages/payloads/SwitchWalletPayload'
import { IdentityPublicKeyWASM } from 'pshenmic-dpp'
import { ApproveStateTransitionPayload } from './messages/payloads/ApproveStateTransitionPayload'
import { ApproveStateTransitionResponse } from './messages/response/ApproveStateTransitionResponse'
import { RejectStateTransitionResponse } from './messages/response/RejectStateTransitionResponse'
import { RejectStateTransitionPayload } from './messages/payloads/RejectStateTransitionPayload'
import { generateRandomHex } from '../utils'

export class PrivateAPIClient {
  constructor () {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!chrome?.runtime?.onMessage) {
      throw new Error('PrivateAPIClient could only be used inside extension context')
    }
  }

  async getStatus (): Promise<GetStatusResponse> {
    const payload: EmptyPayload = {}

    return await this._rpcCall(MessagingMethods.GET_STATUS, payload)
  }

  async setupPassword (password: string): Promise<void> {
    const payload: SetupPasswordPayload = {
      password
    }

    await this._rpcCall(MessagingMethods.SETUP_PASSWORD, payload)
  }

  async checkPassword (password: string): Promise<CheckPasswordResponse> {
    const payload: CheckPasswordPayload = {
      password
    }

    return await this._rpcCall(MessagingMethods.CHECK_PASSWORD, payload)
  }

  async createWallet (walletType: string): Promise<CreateWalletResponse> {
    const payload: CreateWalletPayload = { walletType }

    return await this._rpcCall(MessagingMethods.CREATE_WALLET, payload)
  }

  async switchWallet (walletId: string, network: string): Promise<void> {
    const payload: SwitchWalletPayload = { walletId, network }

    return await this._rpcCall(MessagingMethods.SWITCH_WALLET, payload)
  }

  async createIdentity (identifier: string, privateKeys?: string[]): Promise<void> {
    const payload: CreateIdentityPayload = {
      identifier,
      privateKeys
    }

    return await this._rpcCall(MessagingMethods.CREATE_IDENTITY, payload)
  }

  async getCurrentIdentity (): Promise<string | null> {
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

  async approveStateTransition (hash: string, identity: string, identityPublicKey: IdentityPublicKeyWASM, password: string): Promise<ApproveStateTransitionResponse> {
    const payload: ApproveStateTransitionPayload = {
      hash,
      identity,
      identityPublicKey: identityPublicKey.toBase64(),
      password
    }

    const response: ApproveStateTransitionResponse = await this._rpcCall(MessagingMethods.APPROVE_STATE_TRANSITION, payload)

    return response
  }

  async rejectStateTransition (hash: string): Promise<RejectStateTransitionResponse> {
    const payload: RejectStateTransitionPayload = {
      hash
    }

    const response: RejectStateTransitionResponse = await this._rpcCall(MessagingMethods.REJECT_STATE_TRANSITION, payload)

    return response
  }

  async getStateTransition (hash: string): Promise<GetStateTransitionResponse> {
    const payload: GetStateTransitionPayload = {
      hash
    }

    const response: GetStateTransitionResponse = await this._rpcCall(MessagingMethods.GET_STATE_TRANSITION, payload)

    return response
  }

  async _rpcCall<T>(method: string, payload?: object): Promise<T> {
    const id = generateRandomHex(8)

    return await new Promise((resolve, reject) => {
      const rejectWithError = (message: string): void => {
        chrome.runtime.onMessage.removeListener(handleMessage)

        reject(message)
      }

      const handleMessage = (data: EventData): void => {
        if (data.type === 'response' && data.id === id) {
          if (data.error != null) {
            return rejectWithError(data.error)
          }

          chrome.runtime.onMessage.removeListener(handleMessage)

          resolve(data.payload)
        }
      }

      chrome.runtime.onMessage.addListener(handleMessage)

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

      // @ts-expect-error
      chrome.runtime.onMessage.dispatch(message)
    })
  }
}

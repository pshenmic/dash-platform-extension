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
import { GetStateTransitionPayload } from './messages/payloads/GetStateTransitionPayload'
import { CreateWalletResponse } from './messages/response/CreateWalletResponse'
import { SwitchWalletPayload } from './messages/payloads/SwitchWalletPayload'
import { ApproveStateTransitionPayload } from './messages/payloads/ApproveStateTransitionPayload'
import { ApproveStateTransitionResponse } from './messages/response/ApproveStateTransitionResponse'
import { RejectStateTransitionResponse } from './messages/response/RejectStateTransitionResponse'
import { RejectStateTransitionPayload } from './messages/payloads/RejectStateTransitionPayload'
import { generateRandomHex } from '../utils'
import { GetAppConnectPayload } from './messages/payloads/GetAppConnectPayload'
import { GetAppConnectResponse } from './messages/response/GetAppConnectResponse'
import { ApproveAppConnectPayload } from './messages/payloads/ApproveAppConnectPayload'
import { RejectAppConnectPayload } from './messages/payloads/RejectAppConnectPayload'
import { AppConnect } from './AppConnect'
import { GetIdentitiesResponse } from './messages/response/GetIdentitiesResponse'
import { Identity } from './Identity'
import { WalletType } from './WalletType'
import { ResyncIdentitiesPayload } from './messages/payloads/ResyncIdentitiesPayload'
import { ResyncIdentitiesResponse } from './messages/response/ResyncIdentitiesResponse'
import { ImportIdentityPayload } from './messages/payloads/ImportIdentityPayload'
import { GetAllWalletsResponse, WalletAccountInfo } from './messages/response/GetAllWalletsResponse'
import { Network } from './enums/Network'

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

  async createWallet (walletType: WalletType, mnemonic?: string): Promise<CreateWalletResponse> {
    const payload: CreateWalletPayload = { walletType: WalletType[walletType], mnemonic }

    return await this._rpcCall(MessagingMethods.CREATE_WALLET, payload)
  }

  async getAllWallets (): Promise<WalletAccountInfo[]> {
    const payload: EmptyPayload = {}

    const response: GetAllWalletsResponse = await this._rpcCall(MessagingMethods.GET_ALL_WALLETS, payload)

    return response.wallets.map((wallet) => ({
      walletId: wallet.walletId,
      type: WalletType[wallet.type],
      network: Network[wallet.network],
      label: wallet.label
    }))
  }

  async switchWallet (walletId: string, network: string): Promise<void> {
    const payload: SwitchWalletPayload = { walletId, network }

    return await this._rpcCall(MessagingMethods.SWITCH_WALLET, payload)
  }

  async importIdentity (identifier, privateKeys: string[]): Promise<void> {
    const payload: ImportIdentityPayload = { identifier, privateKeys }

    return await this._rpcCall(MessagingMethods.IMPORT_IDENTITY, payload)
  }

  async resyncIdentities (password?: string, mnemonic?: string): Promise<ResyncIdentitiesResponse> {
    const payload: ResyncIdentitiesPayload = { password, mnemonic }

    const { identitiesCount }: ResyncIdentitiesResponse = await this._rpcCall(MessagingMethods.RESYNC_IDENTITIES, payload)

    return { identitiesCount }
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

  async getIdentities (): Promise<Identity[]> {
    const payload: EmptyPayload = {}

    const response: GetIdentitiesResponse = await this._rpcCall(MessagingMethods.GET_IDENTITIES, payload)

    return response.identities
  }

  async approveStateTransition (hash: string, identity: string, password: string): Promise<ApproveStateTransitionResponse> {
    const payload: ApproveStateTransitionPayload = {
      hash,
      identity,
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

  async getAppConnect (id: string): Promise<AppConnect | null> {
    const payload: GetAppConnectPayload = {
      id
    }

    const response: GetAppConnectResponse = await this._rpcCall(MessagingMethods.GET_APP_CONNECT, payload)

    return response.appConnect
  }

  async approveAppConnect (id: string): Promise<void> {
    const payload: ApproveAppConnectPayload = {
      id
    }

    await this._rpcCall(MessagingMethods.APPROVE_APP_CONNECT, payload)
  }

  async rejectAppConnect (id: string): Promise<void> {
    const payload: RejectAppConnectPayload = {
      id
    }

    await this._rpcCall(MessagingMethods.REJECT_APP_CONNECT, payload)
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

import { EventData } from '../../types/EventData'
import { IdentitiesRepository } from '../repository/IdentitiesRepository'
import { StateTransitionsRepository } from '../repository/StateTransitionsRepository'
import { MessagingMethods } from '../../types/enums/MessagingMethods'
import { StorageAdapter } from '../storage/storageAdapter'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { GetCurrentIdentityHandler } from './private/identities/getCurrentIdentity'
import { GetStateTransitionHandler } from './private/stateTransitions/getStateTransition'
import { ApproveStateTransitionHandler } from './private/stateTransitions/approveStateTransition'
import { RejectStateTransitionHandler } from './private/stateTransitions/rejectStateTransition'
import { APIHandler } from './APIHandler'
import { CreateIdentityHandler } from './private/identities/createIdentity'
import { CreateWalletHandler } from './private/wallet/createWallet'
import { SwitchWalletHandler } from './private/wallet/switchWallet'
import { KeypairRepository } from '../repository/KeypairRepository'
import { WalletRepository } from '../repository/WalletRepository'
import { GetStatusHandler } from './private/extension/status'
import { SetupPasswordHandler } from './private/extension/setupPassword'
import { CheckPasswordHandler } from './private/extension/checkPassword'
import { SwitchIdentityHandler } from './private/wallet/switchIdentity'
import { AppConnectRepository } from '../repository/AppConnectRepository'
import { GetAppConnectHandler } from './private/appConnect/getAppConnect'
import { ApproveAppConnectHandler } from './private/appConnect/approveAppConnect'
import { RejectAppConnectHandler } from './private/appConnect/rejectAppConnect'
import { GetIdentitiesHandler } from './private/identities/getIdentities'
import {FetchIdentityByPublicKeyHashHandler} from "./private/identities/fetchIdentityByPublicKeyHash";

/**
 * Handlers for a messages within extension context
 */
export class PrivateAPI {
  sdk: DashPlatformSDK
  storageAdapter: StorageAdapter

  constructor (sdk: DashPlatformSDK, storageAdapter: StorageAdapter) {
    this.sdk = sdk
    this.storageAdapter = storageAdapter
  }

  handlers: {
    [key: string]: APIHandler
  }

  async handleMessage (data: EventData): Promise<any> {
    const { method, payload } = data

    const handler = this.handlers[method]

    if (handler == null) {
      throw new Error(`Could not find handler for method ${method}`)
    }

    const validation = handler.validatePayload(payload)

    if (validation != null) {
      throw new Error(`Invalid payload: ${validation}`)
    }

    return await handler.handle(data)
  }

  init (): void {
    const identitiesRepository = new IdentitiesRepository(this.storageAdapter, this.sdk)
    const walletRepository = new WalletRepository(this.storageAdapter, identitiesRepository)
    const keypairRepository = new KeypairRepository(this.storageAdapter)
    const stateTransitionsRepository = new StateTransitionsRepository(this.storageAdapter)
    const appConnectRepository = new AppConnectRepository(this.storageAdapter)

    this.handlers = {
      [MessagingMethods.GET_STATUS]: new GetStatusHandler(this.storageAdapter),
      [MessagingMethods.SETUP_PASSWORD]: new SetupPasswordHandler(this.storageAdapter),
      [MessagingMethods.CHECK_PASSWORD]: new CheckPasswordHandler(this.storageAdapter),
      [MessagingMethods.CREATE_IDENTITY]: new CreateIdentityHandler(identitiesRepository, walletRepository, keypairRepository, this.sdk),
      [MessagingMethods.SWITCH_IDENTITY]: new SwitchIdentityHandler(identitiesRepository, walletRepository),
      [MessagingMethods.GET_IDENTITIES]: new GetIdentitiesHandler(identitiesRepository),
      [MessagingMethods.GET_CURRENT_IDENTITY]: new GetCurrentIdentityHandler(identitiesRepository),
      [MessagingMethods.APPROVE_STATE_TRANSITION]: new ApproveStateTransitionHandler(stateTransitionsRepository, identitiesRepository, walletRepository, keypairRepository, this.sdk),
      [MessagingMethods.GET_STATE_TRANSITION]: new GetStateTransitionHandler(stateTransitionsRepository),
      [MessagingMethods.REJECT_STATE_TRANSITION]: new RejectStateTransitionHandler(stateTransitionsRepository, walletRepository),
      [MessagingMethods.CREATE_WALLET]: new CreateWalletHandler(walletRepository),
      [MessagingMethods.SWITCH_WALLET]: new SwitchWalletHandler(walletRepository),
      [MessagingMethods.GET_APP_CONNECT]: new GetAppConnectHandler(appConnectRepository),
      [MessagingMethods.APPROVE_APP_CONNECT]: new ApproveAppConnectHandler(appConnectRepository, this.storageAdapter),
      [MessagingMethods.REJECT_APP_CONNECT]: new RejectAppConnectHandler(appConnectRepository, this.storageAdapter),
      [MessagingMethods.FETCH_IDENTITY_BY_PUBLIC_KEY_HASH]: new FetchIdentityByPublicKeyHashHandler(identitiesRepository, this.sdk)
    }

    chrome.runtime.onMessage.addListener((data: EventData) => {
      const { context, type } = data

      if (context !== 'dash-platform-extension' || type === 'response') {
        return
      }

      const { id, method } = data

      this.handleMessage(data)
        .then((result: any) => {
          const message: EventData = {
            id,
            context: 'dash-platform-extension',
            type: 'response',
            method,
            payload: result,
            error: null
          }

          // @ts-expect-error
          return chrome.runtime.onMessage.dispatch(message)
        })
        .catch(e => {
          const message: EventData = {
            id,
            context: 'dash-platform-extension',
            type: 'response',
            method,
            payload: null,
            error: e.message
          }

          // @ts-expect-error
          return chrome.runtime.onMessage.dispatch(message)
        })
    })
  }
}

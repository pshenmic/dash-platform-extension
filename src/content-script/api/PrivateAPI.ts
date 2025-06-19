import { EventData } from '../../types/EventData'
import { IdentitiesRepository } from '../repository/IdentitiesRepository'
import { StateTransitionsRepository } from '../repository/StateTransitionsRepository'
import { MessagingMethods } from '../../types/enums/MessagingMethods'
import { StorageAdapter } from '../storage/storageAdapter'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { GetCurrentIdentityHandler } from './private/identities/getCurrentIdentity'
import { GetAvailableIdentitiesHandler } from './private/identities/getAvailableIdentities'
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

  init (): void {
    const identitiesRepository = new IdentitiesRepository(this.storageAdapter, this.sdk.dpp, this.sdk)
    const walletRepository = new WalletRepository(this.storageAdapter, identitiesRepository)
    const keypairRepository = new KeypairRepository(this.storageAdapter, this.sdk.dpp)
    const stateTransitionsRepository = new StateTransitionsRepository(this.storageAdapter, this.sdk.dpp)

    this.handlers = {
      [MessagingMethods.GET_STATUS]: new GetStatusHandler(this.storageAdapter),
      [MessagingMethods.SETUP_PASSWORD]: new SetupPasswordHandler(this.storageAdapter),
      [MessagingMethods.CHECK_PASSWORD]: new CheckPasswordHandler(this.storageAdapter),
      [MessagingMethods.CREATE_IDENTITY]: new CreateIdentityHandler(identitiesRepository, walletRepository, keypairRepository, this.sdk.dpp, this.sdk),
      [MessagingMethods.SWITCH_IDENTITY]: new SwitchIdentityHandler(identitiesRepository, walletRepository),
      [MessagingMethods.GET_AVAILABLE_IDENTITIES]: new GetAvailableIdentitiesHandler(identitiesRepository),
      [MessagingMethods.GET_CURRENT_IDENTITY]: new GetCurrentIdentityHandler(identitiesRepository),
      [MessagingMethods.APPROVE_STATE_TRANSITION]: new ApproveStateTransitionHandler(stateTransitionsRepository, identitiesRepository, walletRepository, keypairRepository, this.sdk.dpp),
      [MessagingMethods.GET_STATE_TRANSITION]: new GetStateTransitionHandler(stateTransitionsRepository),
      [MessagingMethods.REJECT_STATE_TRANSITION]: new RejectStateTransitionHandler(stateTransitionsRepository, walletRepository),
      [MessagingMethods.CREATE_WALLET]: new CreateWalletHandler(walletRepository, this.sdk.dpp),
      [MessagingMethods.SWITCH_WALLET]: new SwitchWalletHandler(walletRepository, this.sdk.dpp)
    }

    chrome.runtime.onMessage.addListener((data: EventData) => {
      const { context, type } = data

      if (context !== 'dash-platform-extension' || type === 'response') {
        return
      }

      const { id, method, payload } = data

      const handler = this.handlers[data.method]

      if (handler == null) {
        const message: EventData = {
          id,
          context: 'dash-platform-extension',
          type: 'response',
          method,
          payload: null,
          error: 'Could not find handler for method ' + method
        }

        // @ts-expect-error
        return chrome.runtime.onMessage.dispatch(message)
      }

      const validation = handler.validatePayload(payload)

      if (validation != null) {
        const message: EventData = {
          id,
          context: 'dash-platform-extension',
          type: 'response',
          method,
          payload: null,
          error: validation
        }

        // @ts-expect-error
        return chrome.runtime.onMessage.dispatch(message)
      }

      handler.handle(data)
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

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
import { ResyncIdentitiesHandler } from './private/wallet/resyncIdentities'
import { ImportIdentityHandler } from './private/identities/importIdentity'
import { GetAllWalletsHandler } from './private/wallet/getAllWallets'
import { AddIdentityPrivateKey } from './private/identities/addPrivateKey'
import { GetAvailableKeyPairs } from './private/identities/getAvailableKeyPairs'
import { SwitchNetworkHandler } from './private/wallet/switchNetwork'
import { RemoveIdentityPrivateKeyHandler } from './private/identities/removePrivateKey'
import { GetAllAppConnectsHandler } from './private/appConnect/getAllAppConnects'
import { RemoveAppConnectHandler } from './private/appConnect/removeAppConnect'
import { ExportPrivateKeyHandler } from './private/identities/exportPrivateKey'
import { RegisterUsernameHandler } from './private/identities/registerUsername'

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
      [MessagingMethods.SWITCH_IDENTITY]: new SwitchIdentityHandler(identitiesRepository, walletRepository),
      [MessagingMethods.GET_ALL_WALLETS]: new GetAllWalletsHandler(walletRepository, this.sdk, this.storageAdapter),
      [MessagingMethods.IMPORT_IDENTITY]: new ImportIdentityHandler(identitiesRepository, walletRepository, keypairRepository, this.sdk),
      [MessagingMethods.EXPORT_PRIVATE_KEY]: new ExportPrivateKeyHandler(identitiesRepository, walletRepository, keypairRepository, this.sdk),
      [MessagingMethods.ADD_IDENTITY_PRIVATE_KEY]: new AddIdentityPrivateKey(identitiesRepository, walletRepository, keypairRepository, this.sdk),
      [MessagingMethods.REMOVE_IDENTITY_PRIVATE_KEY]: new RemoveIdentityPrivateKeyHandler(identitiesRepository, walletRepository, keypairRepository, this.sdk),
      [MessagingMethods.GET_AVAILABLE_KEY_PAIRS]: new GetAvailableKeyPairs(identitiesRepository, walletRepository, keypairRepository, this.sdk),
      [MessagingMethods.GET_IDENTITIES]: new GetIdentitiesHandler(identitiesRepository),
      [MessagingMethods.GET_CURRENT_IDENTITY]: new GetCurrentIdentityHandler(walletRepository),
      [MessagingMethods.APPROVE_STATE_TRANSITION]: new ApproveStateTransitionHandler(stateTransitionsRepository, identitiesRepository, walletRepository, keypairRepository, this.sdk),
      [MessagingMethods.GET_STATE_TRANSITION]: new GetStateTransitionHandler(stateTransitionsRepository),
      [MessagingMethods.REJECT_STATE_TRANSITION]: new RejectStateTransitionHandler(stateTransitionsRepository, walletRepository),
      [MessagingMethods.CREATE_WALLET]: new CreateWalletHandler(walletRepository, this.sdk, this.storageAdapter),
      [MessagingMethods.SWITCH_WALLET]: new SwitchWalletHandler(walletRepository, this.storageAdapter),
      [MessagingMethods.SWITCH_NETWORK]: new SwitchNetworkHandler(walletRepository, this.storageAdapter, this.sdk),
      [MessagingMethods.RESYNC_IDENTITIES]: new ResyncIdentitiesHandler(identitiesRepository, walletRepository, this.sdk, this.storageAdapter),
      [MessagingMethods.GET_APP_CONNECT]: new GetAppConnectHandler(appConnectRepository),
      [MessagingMethods.GET_ALL_APP_CONNECTS]: new GetAllAppConnectsHandler(appConnectRepository),
      [MessagingMethods.REMOVE_APP_CONNECT]: new RemoveAppConnectHandler(appConnectRepository),
      [MessagingMethods.APPROVE_APP_CONNECT]: new ApproveAppConnectHandler(appConnectRepository, this.storageAdapter),
      [MessagingMethods.REJECT_APP_CONNECT]: new RejectAppConnectHandler(appConnectRepository, this.storageAdapter),
      [MessagingMethods.REGISTER_USERNAME]: new RegisterUsernameHandler(identitiesRepository, walletRepository, keypairRepository, this.sdk)
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

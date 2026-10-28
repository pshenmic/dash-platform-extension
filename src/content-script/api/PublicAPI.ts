import { DashPlatformSDK } from 'dash-platform-sdk'
import { EventData } from '../../types/EventData'
import { StorageAdapter } from '../storage/storageAdapter'
import { AppConnectRepository } from '../repository/AppConnectRepository'
import { StateTransitionsRepository } from '../repository/StateTransitionsRepository'
import { MessagingMethods } from '../../types/enums/MessagingMethods'
import { PublicAPIHandler } from './PublicAPIHandler'
import { AppConnectStatus } from '../../types/enums/AppConnectStatus'
import { ConnectAppHandler } from './public/connectApp'
import { RequestStateTransitionApprovalHandler } from './public/requestStateTransitionApproval'
import { IdentitiesRepository } from '../repository/IdentitiesRepository'
import { WalletRepository } from '../repository/WalletRepository'

/**
 * Handlers for a messages from a webpage to extension (potentially insecure)
 */
export class PublicAPI {
  sdk: DashPlatformSDK
  storageAdapter: StorageAdapter
  appConnectRepository: AppConnectRepository
  stateTransitionsRepository: StateTransitionsRepository
  identitiesRepository: IdentitiesRepository
  walletRepository: WalletRepository

  constructor (sdk: DashPlatformSDK, storageAdapter: StorageAdapter) {
    this.sdk = sdk
    this.storageAdapter = storageAdapter
  }

  handlers: {
    [key: string]: PublicAPIHandler
  }

  async handleMessage (event: MessageEvent): Promise<any> {
    const { origin, data } = event
    const { method, payload } = data

    const handler = this.handlers[method]

    if (handler == null) {
      throw new Error(`Could not find handler for method ${method as string}`)
    }

    const appConnect = await this.appConnectRepository.getByURL(origin)

    // Connecting is the one thing an unknown origin may ask for. Everything
    // else needs an approved connection, and the handler is handed it so that
    // it can serve only what this website was granted.
    if (method !== MessagingMethods.CONNECT_APP && (appConnect == null || appConnect.status !== AppConnectStatus.approved)) {
      throw new Error(`Application on url ${origin} is not authorized`)
    }

    const validation = handler.validatePayload(payload)

    if (validation != null) {
      throw new Error(`Invalid payload: ${validation}`)
    }

    return await handler.handle(data, { origin, appConnect })
  }

  init (): void {
    this.buildHandlers()
    this.listen()
  }

  buildHandlers (): void {
    const appConnectRepository = new AppConnectRepository(this.storageAdapter)
    this.appConnectRepository = appConnectRepository

    const stateTransitionsRepository = new StateTransitionsRepository(this.storageAdapter)
    this.stateTransitionsRepository = stateTransitionsRepository

    const identitiesRepository = new IdentitiesRepository(this.storageAdapter, this.sdk)
    this.identitiesRepository = identitiesRepository

    const walletRepository = new WalletRepository(this.storageAdapter, this.identitiesRepository)
    this.walletRepository = walletRepository

    this.handlers = {
      [MessagingMethods.CONNECT_APP]: new ConnectAppHandler(appConnectRepository, identitiesRepository, walletRepository, this.storageAdapter),
      [MessagingMethods.REQUEST_STATE_TRANSITION_APPROVAL]: new RequestStateTransitionApprovalHandler(stateTransitionsRepository)
    }
  }

  listen (): void {
    window.addEventListener('message', (message: MessageEvent) => {
      const data = message.data as EventData

      const { context, type, id, method } = data

      if (context !== 'dash-platform-extension' || type === 'response') {
        return
      }

      this.handleMessage(message)
        .then((result: any) => {
          const message: EventData = {
            id,
            context: 'dash-platform-extension',
            type: 'response',
            method,
            payload: result,
            error: null
          }

          window.postMessage(message)
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

          window.postMessage(message)
        })
    }, true)
  }
}

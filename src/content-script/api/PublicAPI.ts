import { DashPlatformSDK } from 'dash-platform-sdk'
import { EventData } from '../../types/EventData'
import { StorageAdapter } from '../storage/storageAdapter'
import { AppConnectRepository } from '../repository/AppConnectRepository'
import { StateTransitionsRepository } from '../repository/StateTransitionsRepository'
import { MessagingMethods } from '../../types/enums/MessagingMethods'
import { APIHandler } from './APIHandler'
import { ConnectAppHandler } from './public/connectApp'
import { RequestStateTransitionApprovalHandler } from './public/requestStateTransitionApproval'
import { IdentitiesRepository } from '../repository/IdentitiesRepository'

/**
 * Handlers for a messages from a webpage to extension (potentially insecure)
 */
export class PublicAPI {
  sdk: DashPlatformSDK
  storageAdapter: StorageAdapter
  appConnectRepository: AppConnectRepository
  stateTransitionsRepository: StateTransitionsRepository
  identitiesRepository: IdentitiesRepository

  constructor (sdk: DashPlatformSDK, storageAdapter: StorageAdapter) {
    this.sdk = sdk
    this.storageAdapter = storageAdapter
  }

  handlers: {
    [key: string]: APIHandler
  }

  async handleMessage (event: MessageEvent): Promise<any> {
    const { origin, data } = event
    const { method, payload } = data

    const handler = this.handlers[method]

    if (handler == null) {
      throw new Error(`Could not find handler for method ${method as string}`)
    }

    const appConnect = await this.appConnectRepository.getByURL(origin)

    // check that origin exists in appConnect
    if (method !== MessagingMethods.CONNECT_APP && (appConnect == null || appConnect.status !== 'approved')) {
      throw new Error(`Application on url ${origin} is not authorized`)
    }

    const validation = handler.validatePayload(payload)

    if (validation != null) {
      throw new Error(`Invalid payload: ${validation}`)
    }

    return await handler.handle(data)
  }

  init (): void {
    const appConnectRepository = new AppConnectRepository(this.storageAdapter)
    this.appConnectRepository = appConnectRepository

    const stateTransitionsRepository = new StateTransitionsRepository(this.storageAdapter, this.sdk.dpp)
    this.stateTransitionsRepository = stateTransitionsRepository

    const identitiesRepository = new IdentitiesRepository(this.storageAdapter, this.sdk.dpp, this.sdk)
    this.identitiesRepository = identitiesRepository

    this.handlers = {
      [MessagingMethods.CONNECT_APP]: new ConnectAppHandler(appConnectRepository, identitiesRepository),
      [MessagingMethods.REQUEST_STATE_TRANSITION_APPROVAL]: new RequestStateTransitionApprovalHandler(stateTransitionsRepository, this.sdk.dpp)
    }

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

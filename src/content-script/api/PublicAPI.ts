import { authorizeOrigin } from './authorizeOrigin'
import { EventData } from '../../types/EventData'
import { StorageAdapter } from '../storage/storageAdapter'
import { AppConnectRepository } from '../repository/AppConnectRepository'
import { MessagingMethods } from '../../types/enums/MessagingMethods'
import { PublicAPIHandler } from './PublicAPIHandler'
import { ConnectAppHandler } from './public/connectApp'
import { RequestStateTransitionApprovalHandler } from './public/requestStateTransitionApproval'
import { IdentitiesRepository } from '../repository/IdentitiesRepository'
import { WalletRepository } from '../repository/WalletRepository'
import { StateTransitionsRepository } from '../repository/StateTransitionsRepository'
import type { StateTransitionInspector } from '../../types/StateTransitionInspection'

/**
 * The entire interface a webpage talks to, served beside the website.
 *
 * This module must stay free of `dash-platform-sdk` and `pshenmic-dpp`, even
 * transitively: pshenmic-dpp allocates a `shared: true` WebAssembly.Memory
 * while its module is evaluated, and that needs `crossOriginIsolated`. A
 * content script shares the website's document and never has it, so the import
 * itself throws.
 *
 * Business logic stays here. The one thing that genuinely needs the SDK —
 * decoding a serialized state transition into its owner and unsigned hash —
 * is asked of the offscreen document through `inspectStateTransition` (see
 * backend/codec.ts). The values that come back are the extension's own decode,
 * so the grant check below still cannot be steered by the page.
 */
export class PublicAPI {
  storageAdapter: StorageAdapter
  appConnectRepository: AppConnectRepository
  identitiesRepository: IdentitiesRepository
  walletRepository: WalletRepository
  stateTransitionsRepository: StateTransitionsRepository

  handlers: {
    [key: string]: PublicAPIHandler
  }

  constructor (storageAdapter: StorageAdapter, inspectStateTransition: StateTransitionInspector) {
    this.storageAdapter = storageAdapter

    const appConnectRepository = new AppConnectRepository(storageAdapter)
    const identitiesRepository = new IdentitiesRepository(storageAdapter)

    this.appConnectRepository = appConnectRepository
    this.identitiesRepository = identitiesRepository
    this.walletRepository = new WalletRepository(storageAdapter, identitiesRepository)
    this.stateTransitionsRepository = new StateTransitionsRepository(storageAdapter)

    this.handlers = {
      [MessagingMethods.CONNECT_APP]: new ConnectAppHandler(appConnectRepository, identitiesRepository, this.walletRepository, storageAdapter),
      [MessagingMethods.REQUEST_STATE_TRANSITION_APPROVAL]: new RequestStateTransitionApprovalHandler(this.stateTransitionsRepository, inspectStateTransition)
    }
  }

  /**
   * Serves one request from a webpage.
   *
   * The origin is passed in rather than read off a MessageEvent so that tests
   * can drive the same entry point the page transport uses. Only the content
   * script supplies it, so a page cannot claim to be another website.
   */
  async handleMessage (data: EventData, origin: string): Promise<any> {
    const { method, payload } = data

    const handler = this.handlers[method]

    if (handler == null) {
      throw new Error(`Could not find handler for method ${method}`)
    }

    const appConnect = await authorizeOrigin(method, this.appConnectRepository, origin)

    const validation = handler.validatePayload(payload)

    if (validation != null) {
      throw new Error(`Invalid payload: ${validation}`)
    }

    return await handler.handle(data, { origin, appConnect })
  }

  /**
   * Registers the page transport. Every method is served here — a method this
   * scope does not know is an error, never a forward, so a page cannot reach
   * the wallet's own API.
   */
  listen (): void {
    window.addEventListener('message', (message: MessageEvent) => {
      const data = message.data as EventData

      const { context, type, id, method } = data

      if (context !== 'dash-platform-extension' || type === 'response') {
        return
      }

      const respond = (payload: any, error: string | null): void => {
        const response: EventData = {
          id,
          context: 'dash-platform-extension',
          type: 'response',
          method,
          payload,
          error
        }

        window.postMessage(response)
      }

      this.handleMessage(data, message.origin)
        .then((result: any) => respond(result, null))
        .catch(e => respond(null, e.message))
    }, true)
  }
}

import { authorizeOrigin } from './authorizeOrigin'
import { EventData } from '../../types/EventData'
import { StorageAdapter } from '../storage/storageAdapter'
import { AppConnectRepository } from '../repository/AppConnectRepository'
import { MessagingMethods } from '../../types/enums/MessagingMethods'
import { PublicAPIHandler } from './PublicAPIHandler'
import { ConnectAppHandler } from './public/connectApp'
import { IdentitiesRepository } from '../repository/IdentitiesRepository'
import { WalletRepository } from '../repository/WalletRepository'

/**
 * Page-facing handlers that run beside the website.
 *
 * This module must stay free of `dash-platform-sdk` and `pshenmic-dpp`, even
 * transitively: pshenmic-dpp allocates a `shared: true` WebAssembly.Memory
 * while its module is evaluated, and that needs `crossOriginIsolated`. A
 * content script shares the website's document and never has it, so the import
 * itself throws. Handlers that do need the SDK live in the offscreen backend
 * (see backend/publicBackendAPI.ts) and are reached through `relay`.
 */
export class PublicAPI {
  storageAdapter: StorageAdapter
  appConnectRepository: AppConnectRepository
  identitiesRepository: IdentitiesRepository
  walletRepository: WalletRepository

  handlers: {
    [key: string]: PublicAPIHandler
  }

  constructor (storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter

    const appConnectRepository = new AppConnectRepository(storageAdapter)
    const identitiesRepository = new IdentitiesRepository(storageAdapter)

    this.appConnectRepository = appConnectRepository
    this.identitiesRepository = identitiesRepository
    this.walletRepository = new WalletRepository(storageAdapter, identitiesRepository)

    this.handlers = {
      [MessagingMethods.CONNECT_APP]: new ConnectAppHandler(appConnectRepository, identitiesRepository, this.walletRepository, storageAdapter)
    }
  }

  /**
   * Serves one request from a webpage.
   *
   * The origin is passed in rather than read off a MessageEvent so that the
   * backend can serve the same handlers from a relayed request. Only a content
   * script may supply it, so a page still cannot claim to be another website.
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
   * Registers the page transport. A method this scope owns is served here;
   * anything else is handed to `relay`, which reaches the backend.
   */
  listen (relay: (data: EventData, origin: string) => Promise<any>): void {
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

      const handled = this.handlers[method] != null
        ? this.handleMessage(data, message.origin)
        : relay(data, message.origin)

      handled
        .then((result: any) => respond(result, null))
        .catch(e => respond(null, e.message))
    }, true)
  }
}

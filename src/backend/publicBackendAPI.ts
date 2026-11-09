import { authorizeOrigin } from '../content-script/api/authorizeOrigin'
import type { PublicAPIHandler } from '../content-script/api/PublicAPIHandler'
import { RequestStateTransitionApprovalHandler } from '../content-script/api/public/requestStateTransitionApproval'
import { AppConnectRepository } from '../content-script/repository/AppConnectRepository'
import { StateTransitionsRepository } from '../content-script/repository/StateTransitionsRepository'
import type { StorageAdapter } from '../content-script/storage/storageAdapter'
import type { EventData } from '../types/EventData'
import { MessagingMethods } from '../types/enums/MessagingMethods'

/**
 * Page-facing handlers that must run in the backend.
 *
 * These need the SDK, and the SDK cannot load beside a website: pshenmic-dpp
 * allocates a `shared: true` WebAssembly.Memory at import time, which requires
 * `crossOriginIsolated`. The offscreen document is an extension page and has it,
 * so the content script relays these requests here instead (see initApp.ts).
 *
 * Authorization is the same check the page-side dispatcher applies, shared
 * through authorizeOrigin so a handler moved across the boundary keeps it.
 */
export class PublicBackendAPI {
  storageAdapter: StorageAdapter
  appConnectRepository: AppConnectRepository
  stateTransitionsRepository: StateTransitionsRepository

  handlers: {
    [key: string]: PublicAPIHandler
  }

  constructor (storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter
    this.appConnectRepository = new AppConnectRepository(storageAdapter)
    this.stateTransitionsRepository = new StateTransitionsRepository(storageAdapter)

    this.handlers = {
      [MessagingMethods.REQUEST_STATE_TRANSITION_APPROVAL]: new RequestStateTransitionApprovalHandler(this.stateTransitionsRepository)
    }
  }

  owns (method: string): boolean {
    return this.handlers[method] != null
  }

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
}

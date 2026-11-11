import type { APIHandler } from './APIHandler'
import type { EventData } from '../../types'

/**
 * A handler table plus the request contract every table shares.
 *
 * PrivateAPI and the backend's internal handlers both dispatch through this
 * class, so a method behaves the same whichever table serves it — unknown
 * method and payload validation messages included.
 */
export class MessageDispatcher {
  handlers: { [key: string]: APIHandler }

  constructor (handlers: { [key: string]: APIHandler }) {
    this.handlers = handlers
  }

  owns (method: string): boolean {
    return this.handlers[method] != null
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
}

import { AppConnect } from '../../types'
import { EventData } from '../../types/EventData'

/**
 * Who is asking. The origin is the one the browser reports for the message,
 * never one the page named itself, and `appConnect` is that origin's
 * connection - null for a website that has never connected, which only
 * CONNECT_APP is allowed to be.
 */
export interface PublicAPIContext {
  origin: string
  appConnect: AppConnect | null
}

/**
 * Handler for a message from a webpage. Unlike a private one it is told which
 * connection the message came from, so it can serve only what that website was
 * granted.
 */
export interface PublicAPIHandler {
  handle: (event: EventData, context: PublicAPIContext) => Promise<any>
  validatePayload: (payload: any) => null | string
}

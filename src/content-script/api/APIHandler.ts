import { EventData } from '../../types'

export interface APIHandler {
  handle: (event: EventData) => Promise<any>
  validatePayload: (payload: any) => null | string
}

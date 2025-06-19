import { EventData } from '../../types/EventData'

export interface APIHandler {
  handle: (event: EventData) => Promise<any>
  validatePayload: (payload: any) => null | string
}

import { AppConnectStatus } from './enums/AppConnectStatus'

export interface AppConnect {
  id: string
  url: string
  status: AppConnectStatus
}

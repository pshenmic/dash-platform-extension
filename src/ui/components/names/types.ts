import { NameStatus } from '../../../types'

export interface NameData {
  name: string
  registrationTime: string | null
  status: NameStatus
}

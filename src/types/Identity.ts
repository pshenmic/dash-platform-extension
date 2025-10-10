import { IdentityType } from './enums/IdentityType'

export interface Identity {
  index: number
  type: IdentityType
  proTxHash: null | string
  identifier: string
  label: string | null
}

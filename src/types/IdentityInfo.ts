import { IdentityType } from './enums/IdentityType'

export interface IdentityInfo {
  type: IdentityType
  proTxHash: null | string
  identifier: string
}

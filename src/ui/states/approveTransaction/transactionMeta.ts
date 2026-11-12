import { StateTransitionTypeEnum, TransactionTypesInfo, type TransactionTypeCode } from '../../../enums'
import type { DecodedStateTransition } from '../../../types/DecodedStateTransition'

// Human title of a decoded state transition type.
export const transactionTypeTitle = (data: DecodedStateTransition): string => {
  const code = StateTransitionTypeEnum[data.type] as TransactionTypeCode | undefined
  return code != null ? TransactionTypesInfo[code]?.title ?? code : 'Transaction'
}

// Credits moved by a transfer or withdrawal; null for other types.
export const transactionCredits = (data: DecodedStateTransition): string | null =>
  data.type === 6 || data.type === 7 ? data.amount : null

// Transfer and withdrawal details already show the signing identity.
export const detailsShowIdentity = (data: DecodedStateTransition): boolean => data.type === 6 || data.type === 7

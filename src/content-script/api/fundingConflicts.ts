import { MessagingMethods } from '../../types/enums/MessagingMethods'
import { IdentityFundingOperation } from '../../types/IdentityFundingOperation'
import { isPendingFundingOperation } from '../repository/IdentityFundingRepository'

// Requests that draw on what a pending identity funding operation has reserved:
// its coins, its Platform address nonce, or — for a legacy registration — the
// identity index sequence. Everything else may run alongside.
const CONFLICTS: Partial<Record<string, (operation: IdentityFundingOperation) => boolean>> = {
  [MessagingMethods.REGISTER_IDENTITY]: operation => operation.kind === 'registration',
  [MessagingMethods.SEND_PLATFORM_TRANSFER]: operation => operation.source === 'platform',
  [MessagingMethods.WITHDRAW_PLATFORM_ADDRESS_TO_CORE]: operation => operation.source === 'platform',
  [MessagingMethods.SHIELD_TO_POOL]: operation => operation.source === 'platform'
}

// Whether a method can conflict with any funding operation at all, so the
// journal is read only when it matters.
export const canConflictWithFunding = (method: string): boolean => CONFLICTS[method] != null

// The pending operation a request would conflict with, if any.
export const findConflictingFunding = (method: string, operations: IdentityFundingOperation[]): IdentityFundingOperation | undefined => {
  const conflicts = CONFLICTS[method]

  if (conflicts == null) {
    return undefined
  }

  return operations.find(operation => isPendingFundingOperation(operation) && conflicts(operation))
}

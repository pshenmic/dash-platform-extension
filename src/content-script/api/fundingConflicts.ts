import { MessagingMethods } from '../../types/enums/MessagingMethods'
import { IdentityFundingOperation } from '../../types/IdentityFundingOperation'
import { isPendingFundingOperation } from '../repository/IdentityFundingRepository'

// Requests that draw on what a pending identity funding operation has reserved.
// A legacy registration picks its identity index the same way a native one does,
// so while a native registration is pending it would take the same index.
const CONFLICTS: Partial<Record<string, (operation: IdentityFundingOperation) => boolean>> = {
  [MessagingMethods.REGISTER_IDENTITY]: operation => operation.kind === 'registration'
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

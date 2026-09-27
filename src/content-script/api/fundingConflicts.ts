import { MessagingMethods } from '../../types/enums/MessagingMethods'
import { IdentityFundingOperation } from '../../types/IdentityFundingOperation'
import { isPendingFundingOperation } from '../repository/IdentityFundingRepository'

// Requests that draw on what a pending identity funding operation has reserved:
// its coins, its Platform address nonce, its shielded notes, or — for a legacy
// registration — the identity index sequence. Everything else may run alongside.
// A Platform address is reserved both by an operation paying from it and by a
// shielded top-up, which exits the pool onto the wallet's own address before
// crediting the identity from it.
const usesPlatformAddress = (operation: IdentityFundingOperation): boolean =>
  operation.source === 'platform' || (operation.source === 'shielded' && operation.kind === 'topUp')

const CONFLICTS: Partial<Record<string, (operation: IdentityFundingOperation) => boolean>> = {
  [MessagingMethods.REGISTER_IDENTITY]: operation => operation.kind === 'registration',
  [MessagingMethods.SEND_PLATFORM_TRANSFER]: usesPlatformAddress,
  [MessagingMethods.WITHDRAW_PLATFORM_ADDRESS_TO_CORE]: usesPlatformAddress,
  [MessagingMethods.SHIELD_TO_POOL]: usesPlatformAddress,
  [MessagingMethods.SEND_SHIELDED_TRANSFER]: operation => operation.source === 'shielded',
  [MessagingMethods.UNSHIELD_TO_ADDRESS]: operation => operation.source === 'shielded',
  [MessagingMethods.WITHDRAW_SHIELDED_TO_CORE]: operation => operation.source === 'shielded'
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

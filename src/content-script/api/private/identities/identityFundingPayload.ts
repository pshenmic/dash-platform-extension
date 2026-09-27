import { RepositoryScope } from '../../../../types/RepositoryScope'
import { IdentityFundingOperation } from '../../../../types/IdentityFundingOperation'

// Funding requests always name the wallet and network they run against, so a
// switch of the selected wallet can never retarget an operation.
export const validateFundingScope = (payload: RepositoryScope): string | null => {
  if (payload == null || typeof payload.walletId !== 'string' || payload.walletId.length === 0) {
    return 'walletId must be provided'
  }
  if (payload.network !== 'mainnet' && payload.network !== 'testnet') {
    return 'network must be mainnet or testnet'
  }

  return null
}

// Signed bytes stay in the backend until confirmation; cancelling a quote must
// not leave a broadcastable transaction in the caller's hands.
export const fundingResponse = (operation: IdentityFundingOperation): IdentityFundingOperation => {
  const { coreTransaction, stateTransition, assetLockProof, ...response } = operation

  return response
}

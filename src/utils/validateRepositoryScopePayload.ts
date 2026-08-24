import { RepositoryScope } from '../types/RepositoryScope'

// Payload shape shared by every request that may name the (network, wallet) pair
// it runs against, instead of inheriting the extension's current selection.
export type ScopedPayload = Partial<RepositoryScope>

// Validates the optional scope fields of such a payload, returning an error
// message or null. The pair is all-or-nothing: a payload naming only one half
// would silently fall back to the current selection for the other, which is the
// ambiguity the explicit scope exists to remove.
export const validateRepositoryScopePayload = (payload: ScopedPayload): string | null => {
  const hasWalletId = payload.walletId != null
  const hasNetwork = payload.network != null

  if (hasWalletId !== hasNetwork) {
    return 'walletId and network must be provided together'
  }

  if (hasWalletId && (typeof payload.walletId !== 'string' || payload.walletId.length === 0)) {
    return 'walletId must be a non-empty string'
  }

  if (hasNetwork && payload.network !== 'testnet' && payload.network !== 'mainnet') {
    return 'network must be either testnet or mainnet'
  }

  return null
}

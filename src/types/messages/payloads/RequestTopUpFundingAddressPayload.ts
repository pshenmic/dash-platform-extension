import { NetworkType } from '../../NetworkType'

export interface RequestTopUpFundingAddressPayload {
  password: string
  // The (network, wallet) the funding address is issued for. Optional, same
  // contract as TopUpIdentityPayload — the address is stored under this pair, so
  // it must match the one later passed to TOP_UP_IDENTITY.
  walletId?: string
  network?: NetworkType
  // The identity the address is reserved for. Optional: defaults to the wallet's
  // current identity. Two top-ups running side by side must each name their own
  // identity, otherwise they are handed the same address and race for it.
  identityId?: string
}

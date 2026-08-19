import { NetworkType } from '../../NetworkType'

export interface RequestTopUpFundingAddressPayload {
  password: string
  // The (network, wallet) the funding address is issued for. Optional, same
  // contract as TopUpIdentityPayload — the address is stored under this pair, so
  // it must match the one later passed to TOP_UP_IDENTITY.
  walletId?: string
  network?: NetworkType
}

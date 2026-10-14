import { NetworkType } from '../../NetworkType'

export interface TopUpIdentityFromWalletPayload {
  // Any identity on this network, not only one of this wallet's. Omitted, the
  // wallet's current identity is topped up.
  identityId?: string
  // Duffs to pay to the funding address. The credits are that amount minus the
  // asset lock fee, times 1000.
  amountDuffs: string
  password: string
  // The (network, wallet) the top-up is bound to, as TOP_UP_IDENTITY takes them:
  // a caller that stays open across wallet and network switches should send them.
  walletId?: string
  network?: NetworkType
}

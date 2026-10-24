export interface RegisterIdentityFromWalletPayload {
  // Duffs to pay to the funding address. The identity is credited with that
  // amount minus the asset lock fee, times 1000.
  amountDuffs: string
  password: string
}

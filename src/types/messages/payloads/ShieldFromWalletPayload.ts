export interface ShieldFromWalletPayload {
  // Duffs to pay out of the wallet. What ends up in the pool is that amount
  // minus the asset lock fee, times 1000 credits, minus the shield fee.
  amountDuffs: string
  password: string
  // Empty or absent shields to the wallet's own shielded address.
  toShieldedAddress?: string
  memo?: string
  account?: number
}

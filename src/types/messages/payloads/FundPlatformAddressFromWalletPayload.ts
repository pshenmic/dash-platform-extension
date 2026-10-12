export interface FundPlatformAddressFromWalletPayload {
  // Platform address to credit; any valid one, including an address of another
  // wallet.
  platformAddress: string
  // Duffs to pay to the funding address. The credits are that amount minus the
  // asset lock fee, times 1000.
  amountDuffs: string
  password: string
}

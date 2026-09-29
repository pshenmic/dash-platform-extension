export interface RegisterIdentityPayload {
  /**
   * The asset lock funding P2PKH address that received the payment. Omit it, with
   * the txid, to fund the asset lock from the wallet's own Core coins instead.
   */
  assetLockFundingAddress?: string
  /** Txid of the asset lock funding transaction that paid to the address */
  assetLockFundingTxid?: string
  /** Extension password used to decrypt the asset lock funding private key */
  password: string
  /**
   * How many credits to lock, when the wallet pays with its own coins. A deposit
   * locks whatever it received, so this belongs to that mode only. Credits, as a
   * string; must be a whole number of duffs (1000 credits).
   */
  amountCredits?: string
}

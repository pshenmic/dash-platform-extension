export interface RegisterIdentityPayload {
  /** The asset lock funding P2PKH address that received the payment */
  assetLockFundingAddress: string
  /** Txid of the asset lock funding transaction that paid to the address */
  assetLockFundingTxid: string
  /** Extension password used to derive the identity registration key */
  password: string
  /**
   * Optional: index of the funding output in the asset lock funding transaction.
   * When omitted the handler scans outputs for a P2PKH script matching assetLockFundingAddress.
   */
  outputIndex?: number
}

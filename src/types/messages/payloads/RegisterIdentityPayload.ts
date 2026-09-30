export interface RegisterIdentityPayload {
  /**
   * The P2PKH address whose outputs fund the asset lock: either a one-off
   * deposit address this extension handed out, or one of the wallet's own Core
   * addresses, in which case its key comes from the seed and the caller picks
   * which coins to spend (LIST_CORE_UTXOS shows them).
   */
  assetLockFundingAddress: string
  /** Txid of the transaction that paid to that address */
  assetLockFundingTxid: string
  /** Extension password: decrypts the one-off key, or the seed */
  password: string
}

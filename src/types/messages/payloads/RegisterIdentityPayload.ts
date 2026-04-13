export interface RegisterIdentityPayload {
  /** The one-time P2PKH address that received the payment */
  paymentAddress: string
  /** Txid of the payment transaction that funded the one-time address */
  paymentTxid: string
  /** Extension password used to decrypt the one-time private key */
  password: string
  /**
   * Optional: index of the payment output in the payment transaction.
   * When omitted the handler defaults to output index 0.
   */
  outputIndex?: number
}

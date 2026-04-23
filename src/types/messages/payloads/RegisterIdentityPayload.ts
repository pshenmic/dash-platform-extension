export interface RegisterIdentityPayload {
  /** The funding P2PKH address that received the payment */
  paymentAddress: string
  /** Txid of the payment transaction that funded the address */
  paymentTxid: string
  /** Extension password used to derive the funding private key */
  password: string
  /**
   * Optional: index of the payment output in the payment transaction.
   * When omitted the handler scans outputs for a P2PKH script matching paymentAddress.
   */
  outputIndex?: number
}

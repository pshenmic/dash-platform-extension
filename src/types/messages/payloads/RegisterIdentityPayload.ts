export interface RegisterIdentityPayload {
  /** The asset lock funding P2PKH address that received the payment */
  assetLockFundingAddress: string
  /** Txid of the asset lock funding transaction that paid to the address */
  assetLockFundingTxid: string
  /** Extension password used to decrypt the asset lock funding private key */
  password: string
}

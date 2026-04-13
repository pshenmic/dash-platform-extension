export interface RegisterIdentityResponse {
  /** Base58-encoded Dash Platform identity identifier */
  identifier: string
  /** Txid of the broadcast asset lock transaction */
  assetLockTxid: string
  /** Hex-encoded hash of the IdentityCreate state transition */
  stateTransitionHash: string
}

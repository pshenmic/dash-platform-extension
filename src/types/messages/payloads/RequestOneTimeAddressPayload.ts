export interface RequestOneTimeAddressPayload {
  /**
   * Extension password. Required for seedphrase wallets to derive
   * deterministic registration funding keys (DIP-0013).
   */
  password?: string
}

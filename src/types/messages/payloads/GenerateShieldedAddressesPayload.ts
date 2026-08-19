export interface GenerateShieldedAddressesPayload {
  // Required — shielded addresses are always derived from the seed, there is no
  // cached public key to derive them from (unlike platform addresses).
  password: string
}

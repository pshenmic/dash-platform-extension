export interface IdentityCreditTransferToAddressesPayload {
  toAddress: string
  amountCredits: string
  password: string
  // identity to send from; defaults to the wallet's current identity
  fromIdentity?: string
}

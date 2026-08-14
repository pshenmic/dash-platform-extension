export interface RegisterIdentityFromAddressPayload {
  // credits to fund the new identity with (spent from a platform address);
  // string because bigint does not serialize across messaging
  amountCredits: string
  password: string
  // optional source platform address; when omitted, the largest funded address
  // covering amount + fee is chosen automatically
  fromAddress?: string
}

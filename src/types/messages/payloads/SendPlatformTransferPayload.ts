export interface SendPlatformTransferPayload {
  toAddress: string
  // amount in credits as a string (bigint does not serialize across messaging)
  amountCredits: string
  password: string
  // optional source platform address; when omitted, the largest funded address
  // covering amount + fee is chosen automatically
  fromAddress?: string
}

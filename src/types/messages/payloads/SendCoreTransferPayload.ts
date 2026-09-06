export interface SendCoreTransferPayload {
  toAddress: string
  // amount in duffs as a string (bigint does not serialize across messaging)
  amountDuffs: string
  password: string
  // optional source Core address; when omitted, every address of the wallet is
  // spendable and the largest unspent outputs are picked first
  fromAddress?: string
}

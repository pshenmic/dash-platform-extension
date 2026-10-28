export interface CoreTransferOutputPayload {
  address: string
  // amount in duffs as a string (bigint does not serialize across messaging)
  amountDuffs: string
}

export interface SendCoreTransactionPayload {
  // One entry per recipient, in the order they are paid
  outputs: CoreTransferOutputPayload[]
  password: string
  // optional source Core address; when omitted, every address of the wallet is
  // spendable and the largest unspent outputs are picked first
  fromAddress?: string
}

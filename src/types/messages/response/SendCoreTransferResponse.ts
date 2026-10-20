export interface SendCoreTransferResponse {
  txid: string
  // amounts in duffs as strings (bigint does not serialize). Unlike the Platform
  // transfer, feeDuffs is the fee actually paid: on L1 it is the difference
  // between the inputs and the outputs, which this transaction fixes itself.
  amountDuffs: string
  feeDuffs: string
  changeDuffs: string
  toAddress: string
  // null when the leftover was dust and went to the fee instead of an output
  changeAddress: string | null
  // the wallet addresses the inputs were spent from
  fromAddresses: string[]
}

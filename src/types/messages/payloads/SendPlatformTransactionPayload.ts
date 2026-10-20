export interface PlatformTransferOutputPayload {
  address: string
  // credits; bigint does not cross the messaging boundary
  amountCredits: string
}

export interface SendPlatformTransactionPayload {
  // One entry per recipient, paid by a single transition.
  outputs: PlatformTransferOutputPayload[]
  password: string
  // Which Platform address pays; without it the one that can cover the total
  // plus the fee and holds the most credits.
  fromAddress?: string
}

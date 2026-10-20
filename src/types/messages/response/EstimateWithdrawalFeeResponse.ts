export interface EstimateWithdrawalFeeResponse {
  source: 'identity' | 'address'
  // Whichever of the two the estimate is about; the other is null.
  identityId: string | null
  fromAddress: string | null
  // All credit amounts are strings; bigint does not cross the messaging boundary.
  //
  // The minimum Platform demands of this withdrawal. It is the number to show as
  // the network fee: the real charge is metered while the transition executes and
  // can come out lower.
  feeCredits: string
  // true for an address withdrawal, where the fee is taken out of the amount, so
  // Core receives `amount - fee`. false for an identity withdrawal, where the fee
  // is charged to the balance on top of the amount.
  feeTakenFromAmount: boolean
  balanceCredits: string
  // The window Platform accepts: below the first nothing arrives, above the
  // second it refuses the transition.
  minAmountCredits: string
  maxAmountCredits: string
  // Rate the resulting L1 transaction pays, in duffs per byte. Platform builds
  // that transaction and takes its fee out of the withdrawn amount, so what
  // lands on the Core address is a little less than `netAmountCredits` / 1000.
  coreFeePerByte: number
  // Only when the call named an amount.
  //
  // What reaches Core, in credits, before the L1 fee above.
  netAmountCredits: string | null
  // What leaves the source in total: amount plus fee for an identity, the amount
  // itself for an address.
  totalCostCredits: string | null
}

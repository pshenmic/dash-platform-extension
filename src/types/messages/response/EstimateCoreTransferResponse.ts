export interface EstimateCoreTransferResponse {
  // All amounts are duffs as strings; bigint does not cross the messaging
  // boundary.
  //
  // What the outputs would pay out. Under `sendMax` this is the amount the
  // single output gets, which the caller shows in the amount field.
  amountDuffs: string
  // Fee of the payment itself: its size at the relay rate. A change output too
  // small to be worth its own 34 bytes is dropped and shows up here instead.
  feeDuffs: string
  // Fee of the asset lock transaction that would follow, for `type:
  // 'assetLock'`; "0" otherwise. It comes out of the deposit rather than out of
  // the wallet, so it is not part of `totalCostDuffs`: what reaches the other
  // side is `amountDuffs` minus this, times 1000 credits.
  assetLockFeeDuffs: string
  // amount + the fee of this payment: what leaves the wallet in total.
  totalCostDuffs: string
  changeDuffs: string
  changeAddress: string
  // The outputs the payment would spend, in the order it would spend them.
  inputs: Array<{ txid: string, vout: number, address: string, amount: string }>
  totalInDuffs: string
  // The largest amount these inputs can pay out across this many outputs. Zero
  // when they cannot cover their own fee.
  maxSendableDuffs: string
}

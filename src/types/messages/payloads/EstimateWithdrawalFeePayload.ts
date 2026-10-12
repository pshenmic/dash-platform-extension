export interface EstimateWithdrawalFeePayload {
  // Where the credits come from: an identity balance (I → C) or one of the
  // wallet's Platform addresses (A → C). For the shielded pool (S → C) the fee
  // depends on the notes a spend uses - that one is ESTIMATE_SHIELDED_FEE with
  // kind 'withdrawal'.
  source: 'identity' | 'address'
  // Which identity, for source 'identity'; the wallet's current one when absent.
  identityId?: string
  // Which Platform address, for source 'address'; without it the address that
  // could carry the largest withdrawal is described.
  fromAddress?: string
  // The amount being considered, in credits. Without it only the fee, the
  // balance and the limits are reported, which is what the amount screen needs
  // before anything is typed.
  amountCredits?: string
}

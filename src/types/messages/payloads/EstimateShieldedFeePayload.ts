import { ShieldedSpendKind } from '../../ShieldedSpendKind'

export interface EstimateShieldedFeePayload {
  // the spend the fee is estimated for
  kind: ShieldedSpendKind
  password: string
  // amount in credits as a string (bigint does not serialize across messaging);
  // omitted to estimate the largest spend instead
  amountCredits?: string
  account?: number
  // transfer only, as sendShieldedTransfer: spend only notes on these addresses
  fromAddresses?: string[]
}

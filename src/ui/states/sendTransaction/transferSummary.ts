import { parseCreditsAmount, creditsToDashDisplay } from '../../../utils'

interface TransferSummaryParams {
  isCredits: boolean
  isPlatformMode: boolean
  amount: string
  platformFeeCredits: bigint
  estimatedFeeCredits: bigint
  tokenWillBeSent: string
  tokenTotal: string
  tokenUnit: string
}

export interface TransferSummary {
  fees: string
  willBeSent: string
  total: string
  unit: string
  hasAmount: boolean
}

/**
 * Values for the transfer summary card. Credits amounts (fees included) are
 * shown in Dash; token amounts keep their own unit.
 */
export function buildTransferSummary ({
  isCredits,
  isPlatformMode,
  amount,
  platformFeeCredits,
  estimatedFeeCredits,
  tokenWillBeSent,
  tokenTotal,
  tokenUnit
}: TransferSummaryParams): TransferSummary {
  const feeCredits = isPlatformMode ? platformFeeCredits : estimatedFeeCredits
  const amountCredits = parseCreditsAmount(amount) ?? 0n

  return {
    fees: `~${creditsToDashDisplay(feeCredits)}`,
    willBeSent: isCredits ? creditsToDashDisplay(amountCredits) : tokenWillBeSent,
    total: isCredits ? creditsToDashDisplay(amountCredits + feeCredits) : tokenTotal,
    unit: isCredits ? 'Dash' : tokenUnit,
    hasAmount: isCredits ? amountCredits > 0n : tokenWillBeSent !== '0'
  }
}

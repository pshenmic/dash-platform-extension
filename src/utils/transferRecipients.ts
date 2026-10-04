import { formatDashAmount, parseDashAmount } from './transferAmount'
import type { TransferRecipient } from '../ui/states/sendTransaction/types'

export interface RecipientsCheck {
  total: bigint
  errors: Record<string, string | null>
  isValid: boolean
}

// Total of the Advanced recipients in base units and an error per recipient, or null where it is fine.
export const checkRecipients = (recipients: TransferRecipient[], decimals: number, minAmount: bigint): RecipientsCheck => {
  const errors: Record<string, string | null> = {}
  let total = 0n

  for (const recipient of recipients) {
    const amount = parseDashAmount(recipient.amount, decimals)

    if (recipient.address === '') errors[recipient.id] = 'Enter a recipient address.'
    else if (recipients.some(other => other.id !== recipient.id && other.address === recipient.address)) errors[recipient.id] = 'This address is already a recipient.'
    else if (amount == null || amount === 0n) errors[recipient.id] = 'Enter an amount.'
    else if (amount < minAmount) errors[recipient.id] = `Minimum amount is ${formatDashAmount(minAmount, decimals)} Dash.`
    else errors[recipient.id] = null

    total += amount ?? 0n
  }

  return { total, errors, isValid: recipients.length > 0 && Object.values(errors).every(error => error == null) }
}

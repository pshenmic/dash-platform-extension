import { CORE_DASH_DECIMALS, PLATFORM_DASH_DECIMALS, formatDashAmount, parseDashAmount } from './transferAmount'
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

// Core outputs paid to the Advanced recipients; an amount that does not parse pays nothing.
export const coreRecipientOutputs = (recipients: TransferRecipient[]): Array<{ address: string, amountDuffs: bigint }> =>
  recipients.map(recipient => ({ address: recipient.address, amountDuffs: parseDashAmount(recipient.amount, CORE_DASH_DECIMALS) ?? 0n }))

// Platform outputs paid to the Advanced recipients in credits; an amount that does not parse pays nothing.
export const platformRecipientOutputs = (recipients: TransferRecipient[]): Array<{ address: string, amountCredits: bigint }> =>
  recipients.map(recipient => ({ address: recipient.address, amountCredits: parseDashAmount(recipient.amount, PLATFORM_DASH_DECIMALS) ?? 0n }))

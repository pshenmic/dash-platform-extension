import type { CoreTransactionData } from '../types/CoreExplorer'

export type CoreTransactionDirection = 'in' | 'out' | 'neutral'

export interface CoreTransactionEffect {
  direction: CoreTransactionDirection
  // Net movement for the wallet, in duffs, always positive.
  amount: bigint
  // The other side of the transfer, empty when the chain does not name one.
  counterparty: string
}

// dashscan returns amounts as integer strings on some endpoints and numbers on
// others; anything unparsable counts as zero rather than throwing.
const toDuffs = (value: unknown): bigint => {
  if (value == null) return 0n

  try {
    return BigInt(typeof value === 'number' ? Math.round(value) : (value as string))
  } catch {
    return 0n
  }
}

/**
 * Net effect of a Core transaction on the wallet: what its own addresses
 * received minus what they spent. Both sides of a transaction can be ours
 * (change outputs), so the direction follows the net, not the presence of
 * an owned address.
 */
export function coreTransactionEffect (
  transaction: CoreTransactionData,
  ownedAddresses: Set<string>
): CoreTransactionEffect {
  const inputs = transaction.vIn ?? []
  const outputs = transaction.vOut ?? []

  const spent = inputs
    .filter(input => input.address != null && ownedAddresses.has(input.address))
    .reduce((sum, input) => sum + toDuffs(input.amount), 0n)
  const received = outputs
    .filter(output => output.address != null && ownedAddresses.has(output.address))
    .reduce((sum, output) => sum + toDuffs(output.value), 0n)

  const net = received - spent
  const direction: CoreTransactionDirection = net > 0n ? 'in' : (net < 0n ? 'out' : 'neutral')

  const foreignInput = inputs.find(input => input.address != null && !ownedAddresses.has(input.address))?.address
  const foreignOutput = outputs.find(output => output.address != null && !ownedAddresses.has(output.address))?.address
  const counterparty = direction === 'in' ? foreignInput : foreignOutput

  return {
    direction,
    amount: net < 0n ? -net : net,
    counterparty: counterparty ?? ''
  }
}

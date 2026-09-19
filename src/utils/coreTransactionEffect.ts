import type { CoreTransactionData } from '../types/CoreExplorer'

// UI-side effect of a raw dashscan transaction, used to render a transaction row.
export type CoreTransactionRowDirection = 'in' | 'out' | 'neutral'

export interface CoreTransactionRowEffect {
  direction: CoreTransactionRowDirection
  // Net movement for the wallet, in duffs, always positive.
  amount: bigint
  // The other side of the transfer, empty when unknown.
  counterparty: string
}

// dashscan returns amounts as strings on some endpoints and numbers on others.
const toDuffs = (value: unknown): bigint => {
  if (value == null) return 0n

  try {
    return BigInt(typeof value === 'number' ? Math.round(value) : (value as string))
  } catch {
    return 0n
  }
}

/**
 * Net effect of a Core transaction on the wallet: received minus spent. Both
 * sides can be ours (change outputs), so direction follows the net.
 */
export function coreTransactionEffect (
  transaction: CoreTransactionData,
  ownedAddresses: Set<string>
): CoreTransactionRowEffect {
  const inputs = transaction.vIn ?? []
  const outputs = transaction.vOut ?? []

  const spent = inputs
    .filter(input => input.address != null && ownedAddresses.has(input.address))
    .reduce((sum, input) => sum + toDuffs(input.amount), 0n)
  const received = outputs
    .filter(output => output.address != null && ownedAddresses.has(output.address))
    .reduce((sum, output) => sum + toDuffs(output.value), 0n)

  const net = received - spent
  const direction: CoreTransactionRowDirection = net > 0n ? 'in' : (net < 0n ? 'out' : 'neutral')

  const foreignInput = inputs.find(input => input.address != null && !ownedAddresses.has(input.address))?.address
  const foreignOutput = outputs.find(output => output.address != null && !ownedAddresses.has(output.address))?.address
  const counterparty = direction === 'in' ? foreignInput : foreignOutput

  return {
    direction,
    amount: net < 0n ? -net : net,
    counterparty: counterparty ?? ''
  }
}

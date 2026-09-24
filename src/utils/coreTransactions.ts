import type { CoreExplorerTransaction } from '../content-script/services/CoreExplorerService'

export type CoreTransactionDirection = 'received' | 'sent' | 'self'

export interface CoreTransactionEffect {
  direction: CoreTransactionDirection
  // paid to the wallet's addresses, change included
  receivedDuffs: bigint
  // spent from the wallet's addresses
  sentDuffs: bigint
  // net change of the wallet balance: negative when the wallet paid
  amountDuffs: bigint
  // null when the wallet did not pay it, or an input's value is unknown
  feeDuffs: bigint | null
  // the other side: senders of a receipt, recipients of a payment
  counterparties: string[]
}

// What a transaction did to the wallet, read from its inputs and outputs against
// the wallet's own addresses. A transaction that spends from the wallet is 'sent',
// or 'self' when every output comes back to it; anything else is 'received'.
export const summarizeCoreTransaction = (transaction: CoreExplorerTransaction, walletAddresses: Set<string>): CoreTransactionEffect => {
  const isOwn = (address: string | null): boolean => address != null && walletAddresses.has(address)

  let receivedDuffs = 0n
  let externalDuffs = 0n
  for (const output of transaction.outputs) {
    if (isOwn(output.address)) {
      receivedDuffs += output.amount
    } else {
      externalDuffs += output.amount
    }
  }

  let sentDuffs = 0n
  for (const input of transaction.inputs) {
    if (isOwn(input.address) && input.amount != null) {
      sentDuffs += input.amount
    }
  }

  let direction: CoreTransactionDirection = 'received'
  if (sentDuffs > 0n) {
    direction = externalDuffs === 0n ? 'self' : 'sent'
  }

  const otherSide = direction === 'received'
    ? transaction.inputs.map(input => input.address)
    : transaction.outputs.map(output => output.address)
  const counterparties = [...new Set(otherSide.filter((address): address is string => address != null && !isOwn(address)))]

  let feeDuffs: bigint | null = null
  if (sentDuffs > 0n && transaction.inputs.every(input => input.amount != null)) {
    const inputsDuffs = transaction.inputs.reduce((sum, input) => sum + (input.amount ?? 0n), 0n)
    const outputsDuffs = transaction.outputs.reduce((sum, output) => sum + output.amount, 0n)

    feeDuffs = inputsDuffs - outputsDuffs
  }

  return {
    direction,
    receivedDuffs,
    sentDuffs,
    amountDuffs: receivedDuffs - sentDuffs,
    feeDuffs,
    counterparties
  }
}

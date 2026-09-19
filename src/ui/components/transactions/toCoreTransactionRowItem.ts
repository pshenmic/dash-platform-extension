import { fromBaseUnit } from '../../../utils/bigintUtils'
import type { CoreTransaction } from '../../../types/messages/response/GetCoreTransactionsResponse'
import { type TransactionRowItem, type TransactionDirection } from './TransactionRow'
import { coreStatusKey } from './transactionStatus'

const DIRECTIONS: Record<CoreTransaction['direction'], TransactionDirection> = {
  received: 'in',
  sent: 'out',
  self: 'neutral'
}

const TITLES: Record<CoreTransaction['direction'], string> = {
  received: 'Receive',
  sent: 'Send',
  self: 'Own Transfer'
}

const DETAIL_LABELS: Record<CoreTransaction['direction'], string> = {
  received: 'From:',
  sent: 'To:',
  self: 'Hash:'
}

const absolute = (value: string): string => value.startsWith('-') ? value.slice(1) : value

/**
 * Core row from a wallet transaction. Direction, amount and counterparties are
 * computed against the account xpub in the content-script, so the row only
 * formats them.
 */
export function toCoreTransactionRowItem (transaction: CoreTransaction): TransactionRowItem {
  const { hash, direction } = transaction
  const counterparty = transaction.counterparties[0] ?? ''
  const isCoinbase = transaction.type === 'COINBASE'
  // A transfer between the wallet's own addresses moves nothing, it only costs a fee.
  const isFee = direction === 'self'

  return {
    id: hash,
    title: isCoinbase && direction === 'received' ? 'Mining Reward' : TITLES[direction],
    detailLabel: counterparty !== '' ? DETAIL_LABELS[direction] : 'Hash:',
    detailValue: counterparty !== '' ? counterparty : hash,
    detailAsIdentifier: true,
    // Core amounts are duffs (10^8); the row shows Dash.
    credits: fromBaseUnit(absolute(isFee ? transaction.feeDuffs ?? '0' : transaction.amountDuffs), 8),
    amountLabel: isFee ? 'Fee:' : undefined,
    unit: 'Dash',
    layer: 'core',
    direction: DIRECTIONS[direction],
    status: coreStatusKey(transaction),
    hash,
    timestamp: transaction.timestamp
  }
}

import { coreTransactionEffect } from '../../../utils'
import { fromBaseUnit } from '../../../utils/bigintUtils'
import { type CoreTransactionData } from '../../../types'
import { type TransactionRowItem } from './TransactionRow'

const TITLES: Record<string, string> = {
  in: 'Receive',
  out: 'Send',
  neutral: 'Transaction'
}

const DETAIL_LABELS: Record<string, string> = {
  in: 'From:',
  out: 'To:',
  neutral: 'Hash:'
}

/**
 * Core row from a dashscan transaction. The wallet's own addresses decide the
 * direction and the amount, so they have to be passed in whole: a transaction
 * paying change back to the wallet spends and receives at the same time.
 */
export function toCoreTransactionRowItem (
  transaction: CoreTransactionData,
  ownedAddresses: Set<string>
): TransactionRowItem {
  const hash = transaction.hash ?? 'unknown'
  const { direction, amount, counterparty } = coreTransactionEffect(transaction, ownedAddresses)
  const isCoinbase = transaction.type === 'COINBASE'
  const detailValue = counterparty !== '' ? counterparty : hash

  return {
    id: hash,
    title: isCoinbase && direction === 'in' ? 'Mining Reward' : TITLES[direction],
    detailLabel: counterparty !== '' ? DETAIL_LABELS[direction] : 'Hash:',
    detailValue,
    detailAsIdentifier: true,
    // Core amounts are duffs (10^8); the row shows Dash.
    credits: fromBaseUnit(amount, 8),
    unit: 'Dash',
    layer: 'core',
    direction,
    hash,
    timestamp: transaction.timestamp
  }
}

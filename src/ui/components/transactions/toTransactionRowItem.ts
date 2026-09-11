import { BatchActions, TransactionTypesInfo } from '../../../enums'
import { type TransactionData } from '../../../types'
import { type TransactionDirection, type TransactionRowItem } from './TransactionRow'

const OUTGOING_TYPES = new Set([
  'IDENTITY_CREDIT_WITHDRAWAL',
  'IDENTITY_CREDIT_TRANSFER',
  'IDENTITY_CREDIT_TRANSFER_TO_ADDRESS'
])

function directionFromTransaction (transaction: TransactionData): TransactionDirection {
  if (transaction.type != null && OUTGOING_TYPES.has(transaction.type)) return 'out'
  if (transaction.type === 'IDENTITY_TOP_UP') return 'in'
  return 'neutral'
}

function titleFromTransaction (transaction: TransactionData): string {
  const { type, batchType } = transaction
  if (batchType != null && batchType !== '' && batchType in BatchActions) {
    return BatchActions[batchType as keyof typeof BatchActions].title
  }
  if (batchType != null && batchType !== '') return batchType
  if (type != null && type !== '' && type in TransactionTypesInfo) {
    return TransactionTypesInfo[type as keyof typeof TransactionTypesInfo].title
  }
  return type ?? 'Unknown Transaction'
}

export function toTransactionRowItem (transaction: TransactionData): TransactionRowItem {
  const hash = transaction.hash ?? 'unknown'
  const gasUsedNumber = Number(transaction.gasUsed)
  const gasAmount = Number.isNaN(gasUsedNumber) ? 0 : gasUsedNumber
  const direction = directionFromTransaction(transaction)

  return {
    id: hash,
    title: titleFromTransaction(transaction),
    detailLabel: 'Hash:',
    detailValue: hash,
    detailAsIdentifier: true,
    credits: Math.abs(Math.round(gasAmount)),
    // The explorer exposes no transfer amount - only gas. Label it for what it
    // is rather than passing a fee off as the amount sent.
    amountLabel: 'Fee:',
    layer: 'platform',
    direction,
    hash,
    timestamp: transaction.timestamp
  }
}

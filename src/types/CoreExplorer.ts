export type { NetworkType } from './NetworkType'

export interface CoreTransactionInput {
  prevTxHash: string | null
  vOutIndex: number | null
  sequence: number | null
  scriptSigASM: string | null
  amount: string | number | null
  address: string | null
}

export interface CoreTransactionOutput {
  value: string | number | null
  number: number | null
  scriptPubKeyASM: string | null
  address: string | null
  addresses?: string[] | null
}

export interface CoreTransactionData {
  hash: string | null
  type: string | null
  blockHeight: number | null
  blockHash: string | null
  timestamp: string | null
  amount: string | number | null
  version: number | null
  vIn: CoreTransactionInput[] | null
  vOut: CoreTransactionOutput[] | null
  confirmations: number | null
  instantLock: string | null
  chainLocked: boolean | null
  coinjoin: boolean | null
  multisig: boolean | null
}

export interface CoreApiPagination {
  page: number
  limit: number
  total: number
}

export interface CoreTransactionsResponse {
  resultSet: CoreTransactionData[]
  pagination?: CoreApiPagination
  error?: string | null
}

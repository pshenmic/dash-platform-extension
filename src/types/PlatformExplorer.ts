export type NetworkType = 'testnet' | 'mainnet'

export interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export interface TransactionData {
  batchType: string | null
  blockHash: string | null
  blockHeight: number | string | null
  data: string | object | null
  error: string | object | null
  gasUsed: number | string | null
  hash: string | null
  index: number | null
  owner: object | null
  status: string | null
  timestamp: string | null
  type: string | null
}

export interface IdentityApiData {
  aliases: Array<object> | null
  averageGasSpent: number | string | null
  balance: string | null
  fundingCoreTx: string | null
  identifier: string | null
  isSystem: boolean
  lastWithdrawalHash: string | null
  lastWithdrawalTimestamp: string | null
  owner: string | null
  publicKeys: Array<object> | null
  revision: number | null
  timestamp: string | null
  totalDataContracts: number | null
  totalDocuments: number | null
  totalGasSpent: number | null
  totalTopUps: number | null
  totalTopUpsAmount: number | null
  totalTransfers: number | null
  totalTxs: number | null
  totalWithdrawals: number | null
  totalWithdrawalsAmount: number | null
  txHash: string | null
}

export interface TransactionsResponse {
  resultSet: TransactionData[]
  error?: string | null
}

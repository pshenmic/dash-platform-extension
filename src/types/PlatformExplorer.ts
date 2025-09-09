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
  aliases: object[] | null
  averageGasSpent: number | string | null
  balance: string | null
  fundingCoreTx: string | null
  identifier: string | null
  isSystem: boolean
  lastWithdrawalHash: string | null
  lastWithdrawalTimestamp: string | null
  owner: string | null
  publicKeys: object[] | null
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

export interface TokenOwner {
  identifier: string
  aliases?: Array<{
    alias: string
    contested: boolean
    documentId: string
    status: string
    timestamp: string
  }> | null
}

export interface TokenData {
  balance: string | number | null
  identifier: string
  position: number
  timestamp: string | null
  description: string
  localizations: {
    [key: string]: {
      pluralForm: string
      singularForm: string
      shouldCapitalize: boolean
    }
  }
  baseSupply: string
  totalSupply: string
  maxSupply: string | null
  owner: TokenOwner
  mintable: boolean
  burnable: boolean
  freezable: boolean
  unfreezable: boolean
  destroyable: boolean
  allowedEmergencyActions: boolean
  dataContractIdentifier: string
  changeMaxSupply: boolean
  totalGasUsed: number | null
  mainGroup: string | null
  totalTransitionsCount: number | null
  totalFreezeTransitionsCount: number | null
  totalBurnTransitionsCount: number | null
  decimals: number
  perpetualDistribution: {
    type: string
    recipientType: string
    recipientValue: string | null
    interval: number
    functionName: string
    functionValue: {
      amount: string
    }
  } | null
  preProgrammedDistribution: any | null
}

export interface TokensPagination {
  page: number
  limit: number
  total: number
}

export interface TokensResponse {
  resultSet: TokenData[]
  pagination: TokensPagination
  error?: string | null
}

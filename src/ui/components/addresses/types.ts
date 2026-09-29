export interface AddressData {
  index: number
  derivationPath: string
  address: string
  balance: string | null
  totalTxs: number | null
  /** Balance is being fetched. */
  loading: boolean
  /** Transaction count is being fetched from the explorer. */
  txsLoading: boolean
}

export interface ShieldedAddressData {
  address: string
  diversifierIndex: number | null
  balance: string | null
  spendableNotes: number | null
  loading?: boolean
}

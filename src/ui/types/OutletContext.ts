export interface OutletContext {
  selectedNetwork: string | null
  setSelectedNetwork: (network: string | null) => void
  selectedWallet: string | null
  setSelectedWallet: (wallet: string | null) => void
  currentIdentity: string | null
  setCurrentIdentity: (identity: string | null) => void
}

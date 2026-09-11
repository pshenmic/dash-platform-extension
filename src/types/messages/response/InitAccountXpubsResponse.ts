import { NetworkType } from '../../NetworkType'

export interface InitAccountXpubsWallet {
  walletId: string
  network: NetworkType
  // true when this call derived and cached the xpub, false when it was already
  // there. Both false is the normal steady state.
  platform: boolean
  core: boolean
}

export interface InitAccountXpubsResponse {
  // How many xpubs this call produced across every wallet. 0 means everything
  // was already cached, which is what a second call always reports.
  initialized: number
  // Every seedphrase wallet found, on both networks. Keystore wallets are
  // skipped: they have no seed to derive from.
  wallets: InitAccountXpubsWallet[]
  // Wallets whose seed could not be read, reported rather than thrown so one
  // unreadable record does not block the rest.
  failed: Array<{ walletId: string, network: NetworkType }>
}

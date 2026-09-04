import { NetworkType } from './NetworkType'

// Pins a repository to one (network, wallet) pair instead of letting it read
// `network` / `currentWalletId` from storage on every call. Long-running
// operations (top-up, registration) resolve the scope once at the start so
// switching the wallet or network mid-flight cannot repoint their storage keys
// halfway through. Both fields are needed: storage keys are
// `${entity}_${network}_${walletId}` and the network is not derivable from the
// wallet id.
export interface RepositoryScope {
  network: NetworkType
  walletId: string
}

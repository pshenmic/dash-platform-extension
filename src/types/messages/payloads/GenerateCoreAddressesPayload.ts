import { CoreAddressChain } from '../../enums/CoreAddressChain'

export interface GenerateCoreAddressesPayload {
  // Which BIP44 chain to advance. Defaults to `receiving` — the chain a caller
  // asking for "an address to receive with" means.
  chain?: CoreAddressChain
  // Optional — only needed to initialize the core xpub when it was not created
  // at wallet creation time (e.g. legacy wallets). Ignored once cached.
  password?: string
}

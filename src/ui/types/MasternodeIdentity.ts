import type { PublicKeyData } from './Identity'

export interface MasternodeIdentityInput {
  proTxHash: string
  ownerKey: string
  votingKey: string
  payoutKey: string
}

export interface MasternodeIdentityPreviewData {
  identities: Array<{
    id: string
    type: 'masternode' | 'voting'
    balance: string
    publicKeys: PublicKeyData[]
  }>
  keys: {
    ownerHex: string
    votingHex?: string
    payoutHex?: string
  }
  proTxHash: string
}

export interface ImportMasternodeIdentityPayload {
  proTxHash: string
  privateKeys: {
    owner?: string
    payout?: string
    voting?: string
  }
}

export interface GetIdentityFundingSourcesResponse {
  // The Core balance in credits (as a string), or why it could not be read.
  core: { balanceCredits?: string, error?: string }
  // Every Platform address of the wallet with what it holds, so a caller can show
  // which ones can fund an identity, or why the list could not be read.
  platform: { addresses: Array<{ address: string, balanceCredits: string }>, error?: string }
}

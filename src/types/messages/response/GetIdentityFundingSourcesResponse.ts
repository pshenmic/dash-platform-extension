export interface GetIdentityFundingSourcesResponse {
  // The Core balance in credits (as a string), or why it could not be read.
  core: { balanceCredits?: string, error?: string }
}

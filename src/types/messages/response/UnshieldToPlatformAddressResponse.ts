export interface UnshieldToPlatformAddressResponse {
  stHash: string
  // amount as a string (bigint does not serialize across messaging)
  amountCredits: string
  toPlatformAddress: string
}

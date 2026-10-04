export interface ShieldFromPlatformAddressResponse {
  stHash: string
  // amount as a string (bigint does not serialize across messaging)
  amountCredits: string
  fromAddress: string
}

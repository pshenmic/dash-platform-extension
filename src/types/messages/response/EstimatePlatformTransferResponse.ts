export interface EstimatePlatformTransferResponse {
  fromAddress: string | null
  // credits as strings
  //
  // The minimum Platform demands of a transfer with this many recipients. It is
  // charged to the source on top of what the recipients get.
  feeCredits: string
  balanceCredits: string
  // The largest total the recipients can share once the fee is paid. Zero when
  // the balance cannot cover the fee.
  maxAmountCredits: string
  outputCount: number
}

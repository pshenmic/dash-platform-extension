export interface EstimatePlatformTransferPayload {
  // How many recipients the transfer would pay; one when absent.
  outputCount?: number
  // Which Platform address pays; without it the one holding the most credits,
  // which is what an amount screen opens on.
  fromAddress?: string
}

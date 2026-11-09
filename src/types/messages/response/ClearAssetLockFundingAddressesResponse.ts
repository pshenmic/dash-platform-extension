export interface ClearAssetLockFundingAddressesResponse {
  // How many entries were deleted. Zero when there was nothing to delete, which
  // is not an error: the caller wanted them gone.
  cleared: number
}

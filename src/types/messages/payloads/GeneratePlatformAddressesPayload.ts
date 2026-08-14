export interface GeneratePlatformAddressesPayload {
  // Optional — only needed to initialize the platform xpub when it was not
  // created at wallet creation time (e.g. legacy wallets). Ignored once cached.
  password?: string
}

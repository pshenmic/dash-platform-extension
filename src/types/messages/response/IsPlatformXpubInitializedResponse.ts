export interface IsPlatformXpubInitializedResponse {
  // true when the platform xpub is cached, i.e. getPlatformAddresses can run
  // without a password. false means the UI must prompt for the password and
  // call cachePlatformXpub first.
  initialized: boolean
}

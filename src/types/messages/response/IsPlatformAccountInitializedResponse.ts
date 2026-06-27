export interface IsPlatformAccountInitializedResponse {
  // true when the account xpub is cached, i.e. getPlatformAddresses can run
  // without a password. false means the UI must prompt for the password and
  // call cachePlatformAccountXpub first.
  initialized: boolean
}

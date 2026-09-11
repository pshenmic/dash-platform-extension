export interface InitCoreXpubPayload {
  // Decrypts the seed the account xpub is derived from. Needed once per wallet;
  // every later Core read works from the cached xpub without it.
  password: string
}

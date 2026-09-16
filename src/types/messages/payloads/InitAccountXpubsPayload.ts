export interface InitAccountXpubsPayload {
  // Decrypts the seed the xpubs are derived from. Needed only while an xpub is
  // still missing; once cached, every address and balance read works without it.
  password: string
}

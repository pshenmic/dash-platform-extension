export interface InitAccountXpubsResponse {
  // true when this call derived and cached the xpub, false when it was already
  // there. Both false is the normal steady state, and for a keystore wallet.
  platform: boolean
  core: boolean
}

export interface SetAppConnectIdentitiesPayload {
  id: string
  // The full grant, not an addition: an identity left out loses access.
  identities: string[]
}

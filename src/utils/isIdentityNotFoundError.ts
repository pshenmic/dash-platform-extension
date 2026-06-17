// Matches the precise "identity not found" messages thrown by the SDK's
// public-key-hash lookups (getIdentityByPublicKeyHash /
// getIdentityByNonUniquePublicKeyHash). It deliberately does NOT match other
// DAPI errors that also contain "not found" (e.g. 'Metadata not found',
// 'GroveDB proof not found'), so a genuine absent-identity can be told apart
// from a transport/proof failure.
const IDENTITY_NOT_FOUND_RE = /Identity with (non unique )?public key hash [0-9a-fA-F]+ not found/

export const isIdentityNotFoundError = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message : String(e ?? '')

  return IDENTITY_NOT_FOUND_RE.test(msg)
}

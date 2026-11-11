/**
 * The signer hands the page a signature, not a signed transition.
 *
 * The extension no longer bundles a `StateTransitionWASM`, so it cannot mutate
 * the transition the caller built. It returns the pieces instead and the caller
 * applies them to its own instance - see docs/INTEGRATION.md.
 */
export interface SignedStateTransitionData {
  // Hex.
  signature: string
  signaturePublicKeyId: number
  // The transition as it was supplied, base64 encoded.
  unsignedBase64: string
}

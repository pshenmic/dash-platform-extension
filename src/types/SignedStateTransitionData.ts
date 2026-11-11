/**
 * What the signer hands back once the user has approved.
 *
 * The extension signs and broadcasts, so this describes a transition that is
 * already on the network. It carries the signed transition itself, not only
 * the signature, because the page cannot always reassemble it: approving can
 * replace the transition's owner and its nonces before signing, so the bytes
 * the page supplied are not necessarily the bytes that went out, and applying
 * `signature` to the page's own instance would then describe a transition
 * that was never broadcast.
 */
export interface SignedStateTransitionData {
  // Hash of the signed transition: its id on the network.
  signedHash: string
  // The transition as it was signed, base64 encoded.
  signedBase64: string
  // Hex.
  signature: string
  signaturePublicKeyId: number
  // The transition as the page supplied it, base64 encoded. Differs from
  // `signedBase64` whenever approving re-owned the transition.
  unsignedBase64: string
}

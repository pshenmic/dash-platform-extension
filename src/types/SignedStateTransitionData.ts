/**
 * What the signer hands back once the user has approved.
 *
 * The extension signs and broadcasts, so this describes a transition that is
 * already on the network. It carries the signed transition and its hash, not
 * only the signature, because the signer takes a serialized transition: a
 * caller that passed one it did not build itself has nothing to apply a
 * signature to, and no other way to learn the id of what went out.
 */
export interface SignedStateTransitionData {
  // Hash of the signed transition: its id on the network.
  signedHash: string
  // The transition as it was signed, base64 encoded.
  signedBase64: string
  // Hex.
  signature: string
  signaturePublicKeyId: number
  // The transition as the page supplied it, base64 encoded.
  unsignedBase64: string
}

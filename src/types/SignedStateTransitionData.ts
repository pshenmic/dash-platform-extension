/**
 * What the signer hands back once the user has approved.
 *
 * The extension signs and broadcasts, so this describes a transition that is
 * already on the network. The signature and the key it was made with are not
 * reported separately: they are only useful for assembling a transition to
 * broadcast later, and the extension has already broadcast this one.
 */
export interface SignedStateTransitionData {
  // Hash of the signed transition: its id on the network.
  signedHash: string
  // The transition as it was signed, base64 encoded.
  signedBase64: string
}

/**
 * What the backend can tell the public layer about a serialized transition
 * without handing it the SDK.
 *
 * Decoding needs `StateTransitionWASM`, which cannot load beside a website, so
 * the offscreen document does it and returns these three facts. The public
 * layer keeps the decisions: whether the owner was granted, whether a signed
 * transition is acceptable, and how to store it.
 */
export interface StateTransitionInspection {
  // Base58 identity the transition belongs to, null for a transition that has
  // no owner (identity create), which no website may submit.
  ownerId: string | null
  // hash(true) - the unsigned hash used as the storage key and popup route.
  unsignedHash: string
  // Whether the serialized transition already carries a signature.
  signed: boolean
}

export type StateTransitionInspector = (encoded: string) => Promise<StateTransitionInspection>

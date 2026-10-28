/**
 * Signing requests this page is waiting for an answer to.
 *
 * Kept per page and in memory on purpose: a website hears about a state
 * transition only when it asked for it itself, so nothing the user signs
 * elsewhere reaches it.
 */
export class StateTransitionRequests {
  hashes: Set<string> = new Set()

  track (unsignedHash: string): void {
    this.hashes.add(unsignedHash)
  }

  forget (unsignedHash: string): void {
    this.hashes.delete(unsignedHash)
  }
}

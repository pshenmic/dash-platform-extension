const ALREADY_IN_CHAIN = 'state transition already in chain'

export const isStateTransitionAlreadyInChainError = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message : String(e ?? '')

  return msg.includes(ALREADY_IN_CHAIN)
}

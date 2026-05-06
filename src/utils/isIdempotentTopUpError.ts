const ALREADY_USED_RE = /^Asset lock transaction [a-fA-F0-9]{64} output \d+ already completely used/
const ALREADY_IN_CHAIN = 'state transition already in chain'

export const isIdempotentTopUpError = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message : String(e ?? '')

  return ALREADY_USED_RE.test(msg) || msg.includes(ALREADY_IN_CHAIN)
}

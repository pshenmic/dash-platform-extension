import { isStateTransitionAlreadyInChainError } from './isStateTransitionAlreadyInChainError'
import { isIdempotentTopUpError } from './isIdempotentTopUpError'

// gRPC-web percent-encodes error text ("tx%20already%20exists%20in%20cache"),
// so match against the decoded form.
const decodedMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error ?? '')

  try {
    return decodeURIComponent(message)
  } catch {
    return message
  }
}

// The network already holds this exact transition: resending the saved bytes
// found it in the mempool cache or in a block. Neither a failure nor a
// confirmation — the result still has to be awaited.
export const isTransitionAlreadyKnownError = (error: unknown): boolean => {
  const message = decodedMessage(error)

  return message.includes('already exists in cache') ||
    isStateTransitionAlreadyInChainError(message) ||
    isIdempotentTopUpError(message)
}

// Nothing is known about the outcome: the request or the wait for its result was
// cut off, and the transition may still execute. The same bytes must be retried;
// this is never a rejection.
export const isOutcomeUnknownError = (error: unknown): boolean => {
  const message = decodedMessage(error).toLowerCase()

  return ['deadline has elapsed', 'timed out', 'timeout', 'fetch failed', 'network error', 'unavailable', 'connection']
    .some(fragment => message.includes(fragment))
}

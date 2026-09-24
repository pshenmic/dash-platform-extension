import type { TokenData } from '../types'

// Number of distinct tokens with a positive balance across several token lists.
export const countHeldTokens = (tokenLists: TokenData[][]): number => {
  const held = new Set<string>()

  for (const token of tokenLists.flat()) {
    if (token.balance != null && BigInt(token.balance) > 0n) {
      held.add(token.identifier)
    }
  }

  return held.size
}

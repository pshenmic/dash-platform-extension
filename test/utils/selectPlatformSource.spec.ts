import { assertSourceCoversFee, selectPlatformSource, PlatformSourceCandidate } from '../../src/utils'
import { MIN_OUTPUT_CREDITS, TRANSFER_FEE_CREDITS } from '../../src/constants'

const candidate = (platformAddress: string, balanceCredits: bigint, nonce = 0, index = 0): PlatformSourceCandidate => ({
  platformAddress,
  derivationPath: `m/9'/1'/17'/0'/0'/${index}`,
  index,
  balanceCredits,
  nonce
})

const AMOUNT = 1_000_000n
const REQUIRED = AMOUNT + TRANSFER_FEE_CREDITS

describe('selectPlatformSource', () => {
  it('picks the largest balance that covers amount + fee', () => {
    const candidates = [
      candidate('a', REQUIRED),
      candidate('b', REQUIRED + 9_000_000n),
      candidate('c', REQUIRED + 1n)
    ]
    expect(selectPlatformSource(candidates, AMOUNT).platformAddress).toBe('b')
  })

  it('accepts a balance exactly equal to amount + fee', () => {
    expect(selectPlatformSource([candidate('a', REQUIRED)], AMOUNT).platformAddress).toBe('a')
  })

  it('throws when no address covers amount + fee', () => {
    const candidates = [candidate('a', AMOUNT), candidate('b', REQUIRED - 1n)]
    expect(() => selectPlatformSource(candidates, AMOUNT)).toThrow(/enough credits/)
  })

  it('throws when the amount is below the minimum output', () => {
    expect(() => selectPlatformSource([candidate('a', REQUIRED)], MIN_OUTPUT_CREDITS - 1n)).toThrow(/Minimum/)
  })

  it('uses the explicit source address when given', () => {
    const candidates = [candidate('a', REQUIRED + 9_000_000n), candidate('b', REQUIRED)]
    expect(selectPlatformSource(candidates, AMOUNT, 'b').platformAddress).toBe('b')
  })

  it('throws when the explicit source address is unknown', () => {
    expect(() => selectPlatformSource([candidate('a', REQUIRED)], AMOUNT, 'zzz')).toThrow(/not found/)
  })

  it('throws when the explicit source address cannot cover amount + fee', () => {
    const candidates = [candidate('a', REQUIRED + 9_000_000n), candidate('b', REQUIRED - 1n)]
    expect(() => selectPlatformSource(candidates, AMOUNT, 'b')).toThrow(/insufficient/)
  })
})

// The source is chosen before the transition exists, so it is chosen against an
// estimate. Once the transition is built, dpp knows the real number, and an
// address short of it has to be refused here rather than on chain.
describe('assertSourceCoversFee', () => {
  const transition = (feeCredits: bigint): any => ({ calculateMinRequiredFee: () => feeCredits })

  it('returns the fee the transition really costs', () => {
    const source = candidate('yRich', AMOUNT + 200_000_000n)

    expect(assertSourceCoversFee(transition(162_851_200n), source, AMOUNT)).toBe(162_851_200n)
  })

  it('refuses a source that covers the amount but not the real fee', () => {
    // Enough for the amount and the flat figure, short of what a shielded
    // transition actually costs: exactly the case that used to reach Platform.
    const source = candidate('yThin', AMOUNT + TRANSFER_FEE_CREDITS)

    expect(() => assertSourceCoversFee(transition(162_851_200n), source, AMOUNT))
      .toThrow('does not cover')
  })

  it('names both numbers, so a caller can say what is missing', () => {
    const source = candidate('yThin', AMOUNT)

    expect(() => assertSourceCoversFee(transition(5_000n), source, AMOUNT))
      .toThrow(`${AMOUNT.toString()} plus the fee of 5000 credits`)
  })
})

import { coreFallbackFeeDuffs, coreFallbackMaxDuffs, platformFallbackEstimate, platformFallbackFeeCredits, shieldedFallbackFee, shownFee } from './transferFeeFallback'
import { coreMaxForOutputs } from './coreSendMax'
import { platformTransferFeeCredits } from './platformTransfer'
import { computeShieldedSpendFee } from './shieldedFee'
import { MAX_WITHDRAWAL_CREDITS, MIN_WITHDRAWAL_CREDITS, SHIELDED_MAX_SPEND_NOTES } from '../constants'

describe('coreFallbackFeeDuffs', () => {
  it('prices 20 inputs, the paid outputs and change at 1 duff per byte', () => {
    expect(coreFallbackFeeDuffs(1)).toBe(3038n)
    expect(coreFallbackFeeDuffs(3)).toBe(3038n + 68n)
  })

  it('is far above a one-input payment', () => {
    expect(coreFallbackFeeDuffs(1) > 226n * 10n).toBe(true)
  })
})

describe('coreFallbackMaxDuffs', () => {
  it('keeps the fallback fee out of the balance', () => {
    expect(coreFallbackMaxDuffs(100_000_000n)).toBe(100_000_000n - 3038n)
  })

  it('leaves room for every extra output like the real send-max', () => {
    expect(coreMaxForOutputs(coreFallbackMaxDuffs(100_000_000n), 3)).toBe(100_000_000n - coreFallbackFeeDuffs(3))
  })

  it('is zero when the fee eats the balance', () => {
    expect(coreFallbackMaxDuffs(1000n)).toBe(0n)
  })
})

describe('platformFallbackEstimate', () => {
  it('reserves 15M credits for an address transfer', () => {
    expect(platformFallbackEstimate('send', 100_000_000n)).toEqual({ feeCredits: 15_000_000n, maxAmountCredits: 85_000_000n, minAmountCredits: null, feeTakenFromAmount: false })
  })

  it('takes an address withdrawal fee from the amount and raises its minimum', () => {
    const estimate = platformFallbackEstimate('withdraw', 1_000_000_000n)
    expect(estimate).toEqual({ feeCredits: 500_000_000n, maxAmountCredits: 500_000_000n, minAmountCredits: 500_000_000n + MIN_WITHDRAWAL_CREDITS, feeTakenFromAmount: true })
  })

  it('charges an identity withdrawal on top of the amount', () => {
    expect(platformFallbackEstimate('identityWithdraw', 1_000_000_000n)?.minAmountCredits).toBe(MIN_WITHDRAWAL_CREDITS)
    expect(platformFallbackEstimate('identityWithdraw', 1_000_000_000n)?.feeTakenFromAmount).toBe(false)
  })

  it('caps a withdrawal at the Platform maximum', () => {
    expect(platformFallbackEstimate('identityWithdraw', MAX_WITHDRAWAL_CREDITS * 2n)?.maxAmountCredits).toBe(MAX_WITHDRAWAL_CREDITS)
  })

  it('is zero Max when the fee eats the balance', () => {
    expect(platformFallbackEstimate('send', 1000n)?.maxAmountCredits).toBe(0n)
  })

  it('reserves the fee of every recipient of an address transfer', () => {
    expect(platformFallbackEstimate('send', 100_000_000n, 3)).toEqual({ feeCredits: 39_000_000n, maxAmountCredits: 61_000_000n, minAmountCredits: null, feeTakenFromAmount: false })
  })

  it('is null for other modes or an unknown balance', () => {
    expect(platformFallbackEstimate('creditTransfer', 100n)).toBeNull()
    expect(platformFallbackEstimate('send', null)).toBeNull()
  })
})

describe('platformFallbackFeeCredits', () => {
  it('is 15M for one recipient and 12M more for each extra one', () => {
    expect(platformFallbackFeeCredits(1)).toBe(15_000_000n)
    expect(platformFallbackFeeCredits(2)).toBe(27_000_000n)
  })

  it('treats no recipients as one', () => {
    expect(platformFallbackFeeCredits(0)).toBe(15_000_000n)
  })

  it('stays above the dpp fee up to the Platform output cap', () => {
    for (const outputs of [1, 2, 10, 128]) expect(platformFallbackFeeCredits(outputs) > platformTransferFeeCredits(outputs)).toBe(true)
  })
})

describe('shieldedFallbackFee', () => {
  it('is the fee of a spend at the note cap', () => {
    expect(shieldedFallbackFee('withdrawal')).toBe(computeShieldedSpendFee('withdrawal', SHIELDED_MAX_SPEND_NOTES))
    expect(shieldedFallbackFee('transfer') > computeShieldedSpendFee('transfer', 1)).toBe(true)
  })
})

describe('shownFee', () => {
  it('hides a fee whose estimate is loading', () => {
    expect(shownFee({ amount: 1n, isLoading: true })).toBeNull()
    expect(shownFee({ amount: 1n, isLoading: false })).toEqual({ amount: 1n, isLoading: false })
    expect(shownFee(null)).toBeNull()
  })
})

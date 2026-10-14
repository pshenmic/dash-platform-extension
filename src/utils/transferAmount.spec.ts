import { assetLockPayment, assetLockReceived, clampDashInput, clampToMax, dashAmountToUsd, endpointDashDecimals, feeOnLayer, formatDashAmount, isAssetLockMode, isDashInputAllowed, parseDashAmount, transferAmountLimits, validateTransferAmount, usdToDashAmount } from './transferAmount'
import { MIN_FEE_RELAY } from '../constants'

describe('transferAmount', () => {
  it('uses 8 decimals for Core and 11 for Platform', () => {
    expect(endpointDashDecimals('core')).toBe(8)
    expect(endpointDashDecimals('identity')).toBe(11)
    expect(endpointDashDecimals('shielded')).toBe(11)
  })

  it('rejects input above the layer precision', () => {
    expect(isDashInputAllowed('1.12345678', 8)).toBe(true)
    expect(isDashInputAllowed('1.123456789', 8)).toBe(false)
    expect(isDashInputAllowed('1.12345678901', 11)).toBe(true)
    expect(isDashInputAllowed('1,5', 11)).toBe(false)
    expect(isDashInputAllowed('', 11)).toBe(true)
  })

  it('parses Dash to base units without float rounding', () => {
    expect(parseDashAmount('1', 11)).toBe(100000000000n)
    expect(parseDashAmount('0.1', 11)).toBe(10000000000n)
    expect(parseDashAmount('0.00000000001', 11)).toBe(1n)
    expect(parseDashAmount('123456789.12345678', 8)).toBe(12345678912345678n)
    expect(parseDashAmount('1.', 8)).toBe(100000000n)
  })

  it('returns null for empty, partial or too precise input', () => {
    expect(parseDashAmount('', 8)).toBeNull()
    expect(parseDashAmount('.', 8)).toBeNull()
    expect(parseDashAmount('0.000000001', 8)).toBeNull()
    expect(parseDashAmount('abc', 8)).toBeNull()
  })

  it('formats base units back to Dash', () => {
    expect(formatDashAmount(100000000000n, 11)).toBe('1')
    expect(formatDashAmount(1n, 11)).toBe('0.00000000001')
    expect(formatDashAmount(150000000n, 8)).toBe('1.5')
  })

  it('builds a USD label only with a rate', () => {
    expect(dashAmountToUsd(150000000n, 8, 20)).toBe('~ $30.00')
    expect(dashAmountToUsd(150000000n, 8, null)).toBeNull()
  })

  it('picks limits by transfer mode', () => {
    expect(transferAmountLimits('identityWithdraw')).toEqual({ min: 1000000n, max: 50000000000000n })
    expect(transferAmountLimits('creditTransfer')).toEqual({ min: 100000n, max: null })
    expect(transferAmountLimits('send')).toEqual({ min: 500000n, max: null })
    expect(transferAmountLimits('tokenTransfer')).toEqual({ min: 1n, max: null })
    expect(transferAmountLimits('coreSend')).toEqual({ min: 547n, max: null })
    expect(transferAmountLimits('coreTopUp')).toEqual({ min: 100000n, max: null })
    expect(transferAmountLimits('coreShield')).toEqual({ min: 213852n, max: null })
  })

  it('validates the amount against balance and limits in Dash', () => {
    const limits = { min: 1000000n, max: 50000000000000n }

    expect(validateTransferAmount(null, 10n, limits, 11, 'Dash')).toBeNull()
    expect(validateTransferAmount(200000000000n, 100000000000n, limits, 11, 'Dash')).toBe('Insufficient balance. Maximum is 1 Dash.')
    expect(validateTransferAmount(10n, 100000000000n, limits, 11, 'Dash')).toBe('Minimum amount is 0.00001 Dash.')
    expect(validateTransferAmount(60000000000000n, null, limits, 11, 'Dash')).toBe('Maximum amount is 500 Dash.')
    expect(validateTransferAmount(50000000n, 100000000000n, limits, 11, 'Dash')).toBeNull()
  })

  it('converts USD input to Dash base units with bigint math', () => {
    expect(usdToDashAmount('30', 20, 8)).toBe(150000000n)
    expect(usdToDashAmount('0.01', 20, 11)).toBe(50000000n)
    expect(usdToDashAmount('', 20, 8)).toBeNull()
    expect(usdToDashAmount('5', null, 8)).toBeNull()
  })

  it('tells the asset lock modes apart', () => {
    expect(isAssetLockMode('coreTopUp')).toBe(true)
    expect(isAssetLockMode('coreFund')).toBe(true)
    expect(isAssetLockMode('coreShield')).toBe(true)
    expect(isAssetLockMode('coreSend')).toBe(false)
    expect(isAssetLockMode(null)).toBe(false)
  })

  it('keeps the relay fee on L1 between the payment and the lock', () => {
    expect(assetLockReceived(100000n)).toBe(100000n - MIN_FEE_RELAY)
    expect(assetLockPayment(100000n - MIN_FEE_RELAY)).toBe(100000n)
  })

  it('counts a fee only when it is paid in the same base units', () => {
    expect(feeOnLayer({ amount: 226n, decimals: 8 }, 8)).toBe(226n)
    expect(feeOnLayer({ amount: 226n, decimals: 8 }, 11)).toBe(0n)
    expect(feeOnLayer(null, 8)).toBe(0n)
  })

  it('caps an amount at the max', () => {
    expect(clampToMax(150n, 100n)).toBe(100n)
    expect(clampToMax(50n, 100n)).toBe(50n)
    expect(clampToMax(100n, 100n)).toBe(100n)
    expect(clampToMax(5n, 0n)).toBe(0n)
    expect(clampToMax(5n, -10n)).toBe(0n)
    expect(clampToMax(5n, null)).toBe(5n)
  })

  it('caps typed Dash input at the max', () => {
    expect(clampDashInput('2', 8, 150000000n)).toBe('1.5')
    expect(clampDashInput('1.2', 8, 150000000n)).toBe('1.2')
    expect(clampDashInput('1.50', 8, 150000000n)).toBe('1.50')
    expect(clampDashInput('1.', 8, 150000000n)).toBe('1.')
    expect(clampDashInput('3', 8, 0n)).toBe('0')
    expect(clampDashInput('0.', 8, 0n)).toBe('0.')
    expect(clampDashInput('', 8, 0n)).toBe('')
    expect(clampDashInput('.', 8, 0n)).toBe('.')
    expect(clampDashInput('1000', 8, null)).toBe('1000')
  })
})

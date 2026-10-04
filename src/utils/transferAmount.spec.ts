import { dashAmountToUsd, endpointDashDecimals, formatDashAmount, isDashInputAllowed, parseDashAmount, transferAmountLimits, validateTransferAmount, usdToDashAmount } from './transferAmount'

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
})

import { estimateCoreSendFee, maxCoreSendAmount } from './coreSendFee'
import { estimateCoreFee, selectCoreUtxos } from './coreTransfer'

const ADDRESS = 'yLQmwB9hninHD8Ceh2UAqLFWCzirppNLik'

const asUtxos = (amounts: bigint[]): Array<{ txid: string, vout: number, amount: bigint, address: string }> =>
  amounts.map((amount, vout) => ({ txid: '0'.repeat(64), vout, amount, address: ADDRESS }))

describe('estimateCoreSendFee', () => {
  const cases: Array<[bigint[], bigint]> = [
    [[5_000n, 100_000n, 20_000n], 10_000n],
    [[50_000n, 40_000n, 30_000n], 80_000n],
    [[100_000n], 99_500n],
    [[100_000n], 99_000n],
    [[100_000n, 100_000n], 199_660n]
  ]

  it.each(cases)('matches selectCoreUtxos for one recipient (%p, %p)', (amounts, amount) => {
    expect(estimateCoreSendFee(amounts, amount, 1)).toBe(selectCoreUtxos(asUtxos(amounts), amount).fee)
  })

  it('adds an output per extra recipient', () => {
    expect(estimateCoreSendFee([1_000_000n], 10_000n, 3)).toBe(294n)
  })

  it('returns null when the UTXOs do not cover the amount', () => {
    expect(estimateCoreSendFee([10_000n, 5_000n], 15_000n, 1)).toBeNull()
    expect(estimateCoreSendFee([], 1_000n, 1)).toBeNull()
  })
})

describe('fee formula', () => {
  it('matches estimateCoreFee of coreTransfer.ts', () => {
    expect(maxCoreSendAmount([1_000_000n], 1)).toBe(1_000_000n - estimateCoreFee(1, 1))
    expect(estimateCoreSendFee([1_000_000n, 1_000_000n], 1_500_000n, 2)).toBe(estimateCoreFee(2, 3))
  })
})

describe('maxCoreSendAmount', () => {
  it('spends every UTXO into the recipients without change', () => {
    expect(maxCoreSendAmount([100_000n, 50_000n, 0n], 1)).toBe(150_000n - 340n)
    expect(maxCoreSendAmount([100_000n], 2)).toBe(100_000n - 226n)
  })

  it('is exactly what selectCoreUtxos accepts', () => {
    const amounts = [100_000n, 50_000n]
    const selection = selectCoreUtxos(asUtxos(amounts), maxCoreSendAmount(amounts, 1))

    expect(selection.change).toBe(0n)
    expect(selection.totalIn).toBe(150_000n)
  })

  it('is zero when the fee eats everything', () => {
    expect(maxCoreSendAmount([100n], 1)).toBe(0n)
    expect(maxCoreSendAmount([], 1)).toBe(0n)
  })
})

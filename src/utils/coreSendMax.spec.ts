import { coreMaxForOutputs, extraCoreOutputsFee } from './coreSendMax'

describe('extraCoreOutputsFee', () => {
  it('charges one output size per output beyond the first', () => {
    expect(extraCoreOutputsFee(1)).toBe(0n)
    expect(extraCoreOutputsFee(3)).toBe(68n)
  })

  it('charges nothing for no outputs', () => {
    expect(extraCoreOutputsFee(0)).toBe(0n)
  })
})

describe('coreMaxForOutputs', () => {
  it('keeps the one-output maximum for one output', () => {
    expect(coreMaxForOutputs(100_000n, 1)).toBe(100_000n)
  })

  it('takes the fee of every extra output out of the maximum', () => {
    expect(coreMaxForOutputs(100_000n, 4)).toBe(100_000n - 102n)
  })

  it('never goes below zero', () => {
    expect(coreMaxForOutputs(50n, 3)).toBe(0n)
  })
})

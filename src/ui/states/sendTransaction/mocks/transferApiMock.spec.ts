import { sendPlatformTransfer, transferMockSettings } from './transferApiMock'

const PARAMS = { inputs: [{ address: 'tdash1from', amount: '5000' }], outputs: [{ address: 'tdash1to', amount: '1000' }] }

describe('transferApiMock', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('sends a platform transfer to several outputs', async () => {
    const promise = sendPlatformTransfer(PARAMS, 'secret')
    await jest.advanceTimersByTimeAsync(2000)
    const result = await promise

    expect(result.stHash).toMatch(/^[0-9a-f]{64}$/)
    expect(BigInt(result.feeCredits)).toBeGreaterThan(0n)
  })

  it('rejects the wrong password', async () => {
    const promise = sendPlatformTransfer(PARAMS, transferMockSettings.rejectedPassword)
    const assertion = expect(promise).rejects.toThrow('Invalid password')

    await jest.advanceTimersByTimeAsync(2000)
    await assertion
  })
})

import {
  estimateCoreFee,
  getTransferOperation,
  listCoreUtxos,
  retryTransferOperation,
  shieldFromCore,
  topUpIdentityFromCore,
  transferMockSettings
} from './transferApiMock'

const settle = async <T>(promise: Promise<T>): Promise<T> => {
  await jest.advanceTimersByTimeAsync(2000)
  return await promise
}

const statuses = async (operationId: string): Promise<string[]> =>
  (await settle(getTransferOperation(operationId))).stages.map(stage => stage.status)

describe('transferApiMock', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    transferMockSettings.failAtStage = null
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('estimates the automatic fee in duffs for one input with change', async () => {
    const result = await settle(estimateCoreFee({ outputs: [{ address: 'y1', amount: '300000000' }] }))

    expect(result.fee).toBe('226')
  })

  it('returns wallet UTXOs', async () => {
    expect((await settle(listCoreUtxos())).length).toBeGreaterThan(0)
  })

  it('rejects the wrong password', async () => {
    const promise = topUpIdentityFromCore('id', '100000', transferMockSettings.rejectedPassword)
    const assertion = expect(promise).rejects.toThrow('Invalid password')

    await jest.advanceTimersByTimeAsync(2000)
    await assertion
  })

  it('moves an asset lock operation through its stages', async () => {
    const { operationId } = await settle(topUpIdentityFromCore('id', '100000', 'secret'))

    const started = await statuses(operationId)
    expect(started).toContain('active')
    expect(started[2]).toBe('pending')

    await jest.advanceTimersByTimeAsync(15000)
    const final = await settle(getTransferOperation(operationId))

    expect(final.stages.map(stage => stage.status)).toEqual(['done', 'done', 'done'])
    expect(final.coreTxHash).toBeDefined()
    expect(final.platformTxHash).toBeDefined()
  })

  it('fails at the configured stage and resumes it on retry', async () => {
    transferMockSettings.failAtStage = 2
    const { operationId } = await settle(shieldFromCore('100000', 'secret'))

    await jest.advanceTimersByTimeAsync(15000)
    expect(await statuses(operationId)).toEqual(['done', 'done', 'failed'])

    await settle(retryTransferOperation(operationId, 'secret'))
    expect(await statuses(operationId)).toEqual(['done', 'done', 'active'])
  })
})

import { ShieldedService } from '../../../src/content-script/services/ShieldedService'
import { SHIELDED_NULLIFIER_QUERY_LIMIT } from '../../../src/constants'

// Platform rejects a getShieldedNullifiers query over the limit outright, so the
// mock does the same: anything past it throws, as the real node would.
const nullifier = (i: number): Uint8Array => Uint8Array.from([i >> 8, i & 0xff])

describe('ShieldedService.nullifierStatuses', () => {
  let sdk: any
  let service: ShieldedService

  beforeEach(() => {
    sdk = {
      shielded: {
        getShieldedNullifiers: jest.fn(async (chunk: Uint8Array[]) => {
          if (chunk.length > SHIELDED_NULLIFIER_QUERY_LIMIT) {
            throw new Error(`trying to check ${chunk.length} nullifiers, maximum is ${SHIELDED_NULLIFIER_QUERY_LIMIT}`)
          }

          return chunk.map(n => ({ nullifier: n, isSpent: n[1] % 2 === 0 }))
        })
      }
    }

    service = new ShieldedService({} as any, sdk)
  })

  const many = (count: number): Uint8Array[] => Array.from({ length: count }, (_, i) => nullifier(i))

  it('makes no request for an empty list', async () => {
    await expect(service.nullifierStatuses([])).resolves.toEqual([])
    expect(sdk.shielded.getShieldedNullifiers).not.toHaveBeenCalled()
  })

  it('sends exactly the limit in a single request', async () => {
    const statuses = await service.nullifierStatuses(many(SHIELDED_NULLIFIER_QUERY_LIMIT))

    expect(sdk.shielded.getShieldedNullifiers).toHaveBeenCalledTimes(1)
    expect(statuses).toHaveLength(SHIELDED_NULLIFIER_QUERY_LIMIT)
  })

  it('splits one past the limit into two requests', async () => {
    await service.nullifierStatuses(many(SHIELDED_NULLIFIER_QUERY_LIMIT + 1))

    const sizes = sdk.shielded.getShieldedNullifiers.mock.calls.map((call: any[]) => call[0].length)
    expect(sizes).toEqual([SHIELDED_NULLIFIER_QUERY_LIMIT, 1])
  })

  it('handles the 110-note wallet that failed in production', async () => {
    const statuses = await service.nullifierStatuses(many(110))

    expect(sdk.shielded.getShieldedNullifiers).toHaveBeenCalledTimes(2)
    expect(statuses).toHaveLength(110)
  })

  it('returns every status, in order, across chunks', async () => {
    const input = many(250)
    const statuses = await service.nullifierStatuses(input)

    const sizes = sdk.shielded.getShieldedNullifiers.mock.calls.map((call: any[]) => call[0].length)
    expect(sizes).toEqual([100, 100, 50])
    expect(statuses.map(s => s.nullifier)).toEqual(input)
    expect(statuses.filter(s => s.isSpent)).toHaveLength(125)
  })

  it('propagates a failure from any chunk', async () => {
    sdk.shielded.getShieldedNullifiers
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('proof verification failed'))

    await expect(service.nullifierStatuses(many(150))).rejects.toThrow('proof verification failed')
  })
})

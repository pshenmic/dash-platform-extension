import { ShieldedService } from '../../../src/content-script/services/ShieldedService'

// A shielded spend that executed must never be reported as one that did not:
// the caller's answer to a failed spend is to send another, and another
// withdrawal is real money leaving the pool.
describe('ShieldedService.confirmSpend', () => {
  const NULLIFIERS = [Uint8Array.from([1, 2]), Uint8Array.from([3, 4])]
  const stateTransition: any = { hash: () => 'stHash' }

  let sdk: any
  let service: ShieldedService

  const spentStatuses = (spent: Uint8Array[]): any[] =>
    NULLIFIERS.map(nullifier => ({ nullifier, isSpent: spent.includes(nullifier) }))

  beforeEach(() => {
    sdk = {
      stateTransitions: { waitForStateTransitionResult: jest.fn(async () => {}) },
      shielded: { getShieldedNullifiers: jest.fn(async () => spentStatuses([])) }
    }

    service = new ShieldedService({} as any, sdk)
  })

  it('asks nothing while the wait itself succeeds', async () => {
    await service.confirmSpend(stateTransition, NULLIFIERS)

    expect(sdk.shielded.getShieldedNullifiers).not.toHaveBeenCalled()
  })

  // The case the frontend hit: the transition executed, and verifying the proof
  // it answered with failed for want of a data contract.
  it('accepts a spend whose nullifiers Platform already holds', async () => {
    sdk.stateTransitions.waitForStateTransitionResult.mockRejectedValue(
      new Error('proof: unknown contract in documents batch transition error: withdrawals contract not available')
    )
    sdk.shielded.getShieldedNullifiers.mockResolvedValue(spentStatuses(NULLIFIERS))

    await expect(service.confirmSpend(stateTransition, NULLIFIERS)).resolves.toBeUndefined()
  })

  it('keeps the failure when the nullifiers are still unspent', async () => {
    sdk.stateTransitions.waitForStateTransitionResult.mockRejectedValue(new Error('state transition failed to execute'))

    await expect(service.confirmSpend(stateTransition, NULLIFIERS)).rejects.toThrow('failed to execute')
  })

  it('refuses to call a spend done on a partial answer', async () => {
    sdk.stateTransitions.waitForStateTransitionResult.mockRejectedValue(new Error('verification failed'))
    sdk.shielded.getShieldedNullifiers.mockResolvedValue(spentStatuses([NULLIFIERS[0]]))

    await expect(service.confirmSpend(stateTransition, NULLIFIERS)).rejects.toThrow('verification failed')
  })

  // A query that cannot answer is not an answer: turning it into a reported
  // success would hide a spend that never happened.
  it('keeps the failure when the nullifiers cannot be read at all', async () => {
    sdk.stateTransitions.waitForStateTransitionResult.mockRejectedValue(new Error('verification failed'))
    sdk.shielded.getShieldedNullifiers.mockRejectedValue(new Error('Failed to fetch'))

    await expect(service.confirmSpend(stateTransition, NULLIFIERS)).rejects.toThrow('verification failed')
  })

  it('reports nothing spent when there are no nullifiers to check', async () => {
    expect(await service.allSpent([])).toBe(false)
  })
})

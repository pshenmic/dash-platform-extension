import { DashPlatformSDK } from 'dash-platform-sdk'
import { base64 } from '@scure/base'
import { inspectStateTransition } from '../../src/backend/codec'

// The public layer decides what to do with a transition, but it cannot decode
// one itself. This is the contract it relies on.
describe('state transition decode for the public layer', () => {
  const sdk = new DashPlatformSDK({ network: 'testnet' })
  const ownerId = 'HT3pUBM1Uv2mKgdPEN1gxa7A4PdsvNY89aJbdSKQb5wR'
  const recipientId = '2HPEBQW4JgatyogjFc5KdYzAXaPAyTEG4ShYYKS7w643'

  const createTransition = (): ReturnType<typeof sdk.identities.createStateTransition> =>
    sdk.identities.createStateTransition('creditTransfer', {
      identityId: ownerId,
      recipientId,
      amount: 100_000_000_000n,
      identityNonce: 1n
    })

  it('returns the owner and unsigned hash the page handler keys on', () => {
    const transition = createTransition()

    expect(inspectStateTransition(base64.encode(transition.bytes()))).toEqual({
      ownerId,
      unsignedHash: transition.hash(true),
      signed: false
    })
  })

  it('refuses bytes that are not a state transition', () => {
    expect(() => inspectStateTransition(base64.encode(Uint8Array.of(0x00, 0x01, 0x02, 0x03)))).toThrow()
  })
})

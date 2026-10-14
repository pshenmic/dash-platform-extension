import { unfinishedOperations } from './unfinishedOperations'
import type { PendingAssetLock } from '../types/messages/response/ListPendingAssetLocksResponse'

const lock = (fields: Partial<PendingAssetLock>): PendingAssetLock => ({
  assetLockTxid: 'lock',
  fundingAddress: 'yFunding',
  fundingTxid: 'paid',
  purpose: 'topUp',
  identityId: 'identity',
  platformAddress: null,
  shieldedAddress: null,
  amountDuffs: '99000',
  createdAt: 1,
  ...fields
})

describe('unfinishedOperations', () => {
  it('keeps top ups, address fundings and shields with their recipient', () => {
    const result = unfinishedOperations([
      lock({}),
      lock({ purpose: 'fundAddress', identityId: null, platformAddress: 'tdash1address' }),
      lock({ purpose: 'shield', identityId: null, shieldedAddress: 'tdash1shielded' })
    ])

    expect(result).toEqual([
      { purpose: 'topUp', recipient: 'identity', assetLockTxid: 'lock', lockedDuffs: 99000n },
      { purpose: 'fundAddress', recipient: 'tdash1address', assetLockTxid: 'lock', lockedDuffs: 99000n },
      { purpose: 'shield', recipient: 'tdash1shielded', assetLockTxid: 'lock', lockedDuffs: 99000n }
    ])
  })

  it('treats a missing or own shielded address as the wallet pool', () => {
    expect(unfinishedOperations([lock({ purpose: 'shield', identityId: null, shieldedAddress: 'own' })])[0].recipient).toBeNull()
    expect(unfinishedOperations([lock({ purpose: 'shield', identityId: null, shieldedAddress: undefined as unknown as null })])[0].recipient).toBeNull()
  })

  it('keeps only the oldest record per purpose and recipient', () => {
    const result = unfinishedOperations([
      lock({ assetLockTxid: 'newer', createdAt: 5 }),
      lock({ assetLockTxid: 'older', createdAt: 2 }),
      lock({ assetLockTxid: 'other', identityId: 'other', createdAt: 3 })
    ])

    expect(result.map(operation => operation.assetLockTxid)).toEqual(['older', 'other'])
  })

  it('leaves out registrations and records a repeated call does not resume', () => {
    expect(unfinishedOperations([
      lock({ purpose: 'registration', identityId: null }),
      lock({ fundingTxid: null }),
      lock({ identityId: null }),
      lock({ purpose: 'fundAddress', identityId: null, platformAddress: null }),
      lock({ amountDuffs: null })
    ])).toEqual([])
  })
})

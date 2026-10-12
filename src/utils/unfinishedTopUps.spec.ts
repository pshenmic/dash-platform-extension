import { unfinishedTopUps } from './unfinishedTopUps'
import type { PendingAssetLock } from '../types/messages/response/ListPendingAssetLocksResponse'

const lock = (fields: Partial<PendingAssetLock>): PendingAssetLock => ({
  assetLockTxid: 'lock',
  fundingAddress: 'yFunding',
  fundingTxid: 'paid',
  purpose: 'topUp',
  identityId: 'identity',
  platformAddress: null,
  amountDuffs: '99000',
  createdAt: 1,
  ...fields
})

describe('unfinishedTopUps', () => {
  it('keeps identity top ups and address fundings with their recipient', () => {
    const result = unfinishedTopUps([
      lock({}),
      lock({ purpose: 'fundAddress', identityId: null, platformAddress: 'tdash1address' })
    ])

    expect(result).toEqual([
      { purpose: 'topUp', recipient: 'identity', fundingAddress: 'yFunding', fundingTxid: 'paid', lockedDuffs: 99000n },
      { purpose: 'fundAddress', recipient: 'tdash1address', fundingAddress: 'yFunding', fundingTxid: 'paid', lockedDuffs: 99000n }
    ])
  })

  it('leaves out registrations and records that cannot be repeated', () => {
    expect(unfinishedTopUps([
      lock({ purpose: 'registration', identityId: null }),
      lock({ fundingTxid: null }),
      lock({ fundingAddress: null }),
      lock({ identityId: null }),
      lock({ purpose: 'fundAddress', identityId: null, platformAddress: null }),
      lock({ amountDuffs: null })
    ])).toEqual([])
  })
})

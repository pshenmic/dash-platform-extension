import { findUnfinishedTopUp, hasPendingShield, unfinishedTopUps } from './unfinishedTopUps'
import type { UnfinishedTopUp } from './unfinishedTopUps'
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
      lock({ purpose: 'shield', identityId: null }),
      lock({ fundingTxid: null }),
      lock({ fundingAddress: null }),
      lock({ identityId: null }),
      lock({ purpose: 'fundAddress', identityId: null, platformAddress: null }),
      lock({ amountDuffs: null })
    ])).toEqual([])
  })
})

describe('findUnfinishedTopUp', () => {
  const topUp = (fields: Partial<UnfinishedTopUp>): UnfinishedTopUp => ({
    purpose: 'topUp',
    recipient: 'identity',
    fundingAddress: 'yFunding',
    fundingTxid: 'paid',
    lockedDuffs: 99000n,
    ...fields
  })

  it('prefers the record locking the same amount', () => {
    const other = topUp({ fundingTxid: 'older', lockedDuffs: 5000n })
    const same = topUp({})

    expect(findUnfinishedTopUp([other, same], 'topUp', 'identity', 99000n)).toBe(same)
  })

  it('falls back to the first record of the recipient', () => {
    const first = topUp({ lockedDuffs: 5000n })

    expect(findUnfinishedTopUp([first, topUp({ lockedDuffs: 7000n })], 'topUp', 'identity', 99000n)).toBe(first)
  })

  it('ignores other recipients and purposes', () => {
    const topUps = [topUp({ recipient: 'other' }), topUp({ purpose: 'fundAddress' })]

    expect(findUnfinishedTopUp(topUps, 'topUp', 'identity', 99000n)).toBeNull()
  })
})

describe('hasPendingShield', () => {
  it('finds a shielding record', () => {
    expect(hasPendingShield([lock({}), lock({ purpose: 'shield', identityId: null })])).toBe(true)
    expect(hasPendingShield([lock({})])).toBe(false)
  })
})

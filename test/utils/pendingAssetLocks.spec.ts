import { assetLockRecipient, findUnfinishedAssetLock } from '../../src/utils/pendingAssetLocks'
import { PendingAssetLockSchema } from '../../src/content-script/storage/storageSchema'

const record = (overrides: Partial<PendingAssetLockSchema>): PendingAssetLockSchema => ({
  assetLockTxid: 'a'.repeat(64),
  fundingAddress: 'yFunding',
  fundingTxid: 'b'.repeat(64),
  purpose: 'topUp',
  identityId: null,
  platformAddress: null,
  shieldedAddress: null,
  amountDuffs: '99999000',
  createdAt: 1000,
  ...overrides
})

describe('unfinished asset locks', () => {
  describe('assetLockRecipient', () => {
    it('names whoever the money was for', () => {
      expect(assetLockRecipient(record({ identityId: 'identityA' }))).toBe('identityA')
      expect(assetLockRecipient(record({ purpose: 'fundAddress', platformAddress: 'tdash1them' }))).toBe('tdash1them')
      expect(assetLockRecipient(record({ purpose: 'shield', shieldedAddress: 'tdashshielded1them' }))).toBe('tdashshielded1them')
    })

    it('is nobody for a registration and for a shield into the own pool', () => {
      expect(assetLockRecipient(record({ purpose: 'registration' }))).toBeNull()
      expect(assetLockRecipient(record({ purpose: 'shield' }))).toBeNull()
    })
  })

  describe('findUnfinishedAssetLock', () => {
    const mine = record({ identityId: 'identityA', assetLockTxid: 'c'.repeat(64), createdAt: 2000 })
    const older = record({ identityId: 'identityA', assetLockTxid: 'd'.repeat(64), createdAt: 1000 })
    const theirs = record({ identityId: 'identityB' })
    const funding = record({ purpose: 'fundAddress', platformAddress: 'tdash1them' })

    it('finds the one for this recipient', () => {
      expect(findUnfinishedAssetLock([theirs, mine], 'topUp', 'identityA')).toBe(mine)
    })

    it('takes the one that has been waiting longest', () => {
      expect(findUnfinishedAssetLock([mine, older], 'topUp', 'identityA')).toBe(older)
    })

    it('does not cross purposes or recipients', () => {
      expect(findUnfinishedAssetLock([theirs], 'topUp', 'identityA')).toBeNull()
      expect(findUnfinishedAssetLock([funding], 'topUp', 'tdash1them')).toBeNull()
      expect(findUnfinishedAssetLock([mine], 'registration', null)).toBeNull()
    })

    it('matches a registration and an own-pool shield by having no recipient', () => {
      const registration = record({ purpose: 'registration' })
      const ownShield = record({ purpose: 'shield' })

      expect(findUnfinishedAssetLock([registration, ownShield], 'registration', null)).toBe(registration)
      expect(findUnfinishedAssetLock([registration, ownShield], 'shield', null)).toBe(ownShield)
      expect(findUnfinishedAssetLock([ownShield], 'shield', 'tdashshielded1them')).toBeNull()
    })
  })
})

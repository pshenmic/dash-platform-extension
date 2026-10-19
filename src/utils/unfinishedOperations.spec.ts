import { continuationDraft, findResumedOperation, isUnsendableFundingError, resumedAmounts, unfinishedOperations } from './unfinishedOperations'
import type { UnfinishedOperation } from './unfinishedOperations'
import { SHIELD_DEPOSIT_FEE_DUFFS, assetLockPayment } from './transferAmount'
import type { PendingAssetLock } from '../types/messages/response/ListPendingAssetLocksResponse'
import type { TransferDraft } from '../ui/states/sendTransaction/types'

const lock = (fields: Partial<PendingAssetLock>): PendingAssetLock => ({
  assetLockTxid: 'lock',
  fundingAddress: 'yFunding',
  fundingTxid: 'paid',
  purpose: 'topUp',
  stage: 'assetLocked',
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
      { purpose: 'topUp', recipient: 'identity', fundingTxid: 'paid', fundingAddress: 'yFunding', lockedDuffs: 99000n },
      { purpose: 'fundAddress', recipient: 'tdash1address', fundingTxid: 'paid', fundingAddress: 'yFunding', lockedDuffs: 99000n },
      { purpose: 'shield', recipient: 'tdash1shielded', fundingTxid: 'paid', fundingAddress: 'yFunding', lockedDuffs: 99000n }
    ])
  })

  it('keeps a funded record that has no asset lock yet', () => {
    expect(unfinishedOperations([lock({ stage: 'funded', assetLockTxid: null })])).toEqual([
      { purpose: 'topUp', recipient: 'identity', fundingTxid: 'paid', fundingAddress: 'yFunding', lockedDuffs: 99000n }
    ])
  })

  it('treats a missing shielded address as the wallet pool', () => {
    expect(unfinishedOperations([lock({ purpose: 'shield', identityId: null, shieldedAddress: undefined as unknown as null })])[0].recipient).toBeNull()
  })

  it('keeps only the oldest record per purpose and recipient', () => {
    const result = unfinishedOperations([
      lock({ fundingTxid: 'newer', createdAt: 5 }),
      lock({ fundingTxid: 'older', createdAt: 2 }),
      lock({ fundingTxid: 'other', identityId: 'other', createdAt: 3 })
    ])

    expect(result.map(operation => operation.fundingTxid)).toEqual(['older', 'other'])
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

describe('isUnsendableFundingError', () => {
  it('recognises a payment that cannot be sent again', () => {
    expect(isUnsendableFundingError('Funding payment abc was recorded without its signed transaction and cannot be sent again')).toBe(true)
    expect(isUnsendableFundingError('Failed to fetch')).toBe(false)
  })
})

const operation = (fields: Partial<UnfinishedOperation>): UnfinishedOperation => ({
  purpose: 'topUp',
  recipient: 'identity',
  fundingTxid: 'paid',
  fundingAddress: 'yFunding',
  lockedDuffs: 99000n,
  ...fields
})

const draft = (fields: Partial<TransferDraft>): TransferDraft => ({
  from: { type: 'core', identityId: null },
  to: { type: 'identity', recipient: 'identity', shieldToMyself: false },
  asset: { type: 'dash' },
  amount: '0.5',
  isAdvanced: false,
  recipients: [],
  changeAddress: null,
  ...fields
})

describe('findResumedOperation', () => {
  const operations = [
    operation({}),
    operation({ purpose: 'fundAddress', recipient: 'tdash1address', fundingTxid: 'fund' }),
    operation({ purpose: 'shield', recipient: null, fundingTxid: 'own' }),
    operation({ purpose: 'shield', recipient: 'tdash1zother', fundingTxid: 'other' })
  ]

  it('matches the purpose and the recipient of a Core draft', () => {
    expect(findResumedOperation(operations, draft({}))?.fundingTxid).toBe('paid')
    expect(findResumedOperation(operations, draft({ to: { type: 'platformAddress', recipient: ' tdash1address ', shieldToMyself: false } }))?.fundingTxid).toBe('fund')
    expect(findResumedOperation(operations, draft({ to: { type: 'shielded', recipient: '', shieldToMyself: true } }))?.fundingTxid).toBe('own')
    expect(findResumedOperation(operations, draft({ to: { type: 'shielded', recipient: 'tdash1zother', shieldToMyself: false } }))?.fundingTxid).toBe('other')
  })

  it('finds nothing for another recipient, type or sender, and in Advanced mode', () => {
    expect(findResumedOperation(operations, draft({ to: { type: 'identity', recipient: 'someone', shieldToMyself: false } }))).toBeNull()
    expect(findResumedOperation(operations, draft({ to: { type: 'platformAddress', recipient: 'identity', shieldToMyself: false } }))).toBeNull()
    expect(findResumedOperation(operations, draft({ from: { type: 'identity', identityId: 'sender' } }))).toBeNull()
    expect(findResumedOperation(operations, draft({ isAdvanced: true }))).toBeNull()
  })
})

describe('resumedAmounts', () => {
  it('pays the lock plus the relay fee and delivers the lock, minus the shield fee for a shield', () => {
    expect(resumedAmounts(operation({}))).toEqual({ amount: assetLockPayment(99000n), received: 99000n })
    expect(resumedAmounts(operation({ purpose: 'shield', recipient: null })).received).toBe(99000n - SHIELD_DEPOSIT_FEE_DUFFS)
  })
})

describe('continuationDraft', () => {
  it('fills a simple Core payment of the operation and finds it again', () => {
    const next = continuationDraft(draft({ from: { type: 'identity', identityId: 'sender' }, isAdvanced: true }), operation({ purpose: 'shield', recipient: null }))

    expect(next).toMatchObject({ from: { type: 'core' }, to: { type: 'shielded', recipient: '', shieldToMyself: true }, asset: { type: 'dash' }, isAdvanced: false })
    expect(findResumedOperation([operation({ purpose: 'shield', recipient: null })], next)).not.toBeNull()
  })
})

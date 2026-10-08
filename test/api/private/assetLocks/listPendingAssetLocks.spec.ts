import { ListPendingAssetLocksHandler } from '../../../../src/content-script/api/private/assetLocks/listPendingAssetLocks'
import { PendingAssetLocksRepository } from '../../../../src/content-script/repository/PendingAssetLocksRepository'
import { MemoryStorageAdapter } from '../../../../src/content-script/storage/memoryStorageAdapter'
import { StorageAdapter } from '../../../../src/content-script/storage/storageAdapter'

// What is left when an operation stopped after the money was committed on L1:
// the wallet's own coins leave a record of their own, a deposit address leaves
// an entry that was never marked used, and both are reported together.
describe('pending asset locks', () => {
  const ownTxid = 'a'.repeat(64)
  const depositTxid = 'b'.repeat(64)
  const fundingTxid = 'd'.repeat(64)
  const identityId = '2HPEBQW4JgatyogjFc5KdYzAXaPAyTEG4ShYYKS7w643'

  let storage: StorageAdapter
  let walletId: string
  let walletCounter = 0
  let pendingAssetLocksRepository: PendingAssetLocksRepository
  let assetLockFundingAddressesRepository: any
  let handler: ListPendingAssetLocksHandler

  const list = async (): Promise<any> => await handler.handle()

  beforeEach(async () => {
    // The in-memory adapter keeps one module-level store, so each test gets its
    // own wallet instead of leaking entries into the next one.
    storage = new MemoryStorageAdapter()
    walletId = `wallet${++walletCounter}`

    await storage.set('network', 'testnet')
    await storage.set('currentWalletId', walletId)

    pendingAssetLocksRepository = new PendingAssetLocksRepository(storage)
    assetLockFundingAddressesRepository = { findAllBroadcasted: jest.fn(async () => []) }

    handler = new ListPendingAssetLocksHandler(pendingAssetLocksRepository, assetLockFundingAddressesRepository)
  })

  it('says nothing when every operation finished', async () => {
    expect(await list()).toEqual({ assetLocks: [] })
  })

  it('reports an asset lock paid from the wallet own coins', async () => {
    await pendingAssetLocksRepository.create({
      assetLockTxid: ownTxid,
      fundingAddress: 'yOwnAddress',
      fundingTxid,
      purpose: 'topUp',
      identityId,
      amountDuffs: '100000000',
      createdAt: 1000
    })

    expect((await list()).assetLocks).toEqual([{
      assetLockTxid: ownTxid,
      fundingAddress: 'yOwnAddress',
      fundingTxid,
      purpose: 'topUp',
      identityId,
      amountDuffs: '100000000',
      createdAt: 1000
    }])
  })

  it('reports a deposit whose asset lock was broadcast and never used', async () => {
    assetLockFundingAddressesRepository.findAllBroadcasted.mockResolvedValue([
      { address: 'yDeposit', assetLockTxid: depositTxid, used: false, purpose: 'registration' }
    ])

    expect((await list()).assetLocks).toEqual([{
      assetLockTxid: depositTxid,
      fundingAddress: 'yDeposit',
      fundingTxid: null,
      purpose: 'registration',
      identityId: null,
      amountDuffs: null,
      createdAt: null
    }])
  })

  it('newest first, and the same asset lock is not reported twice', async () => {
    await pendingAssetLocksRepository.create({ assetLockTxid: ownTxid, fundingAddress: 'yOwnAddress', fundingTxid, purpose: 'registration', identityId: null, amountDuffs: '1', createdAt: 2000 })
    await pendingAssetLocksRepository.create({ assetLockTxid: 'c'.repeat(64), fundingAddress: 'yOwnAddress', fundingTxid, purpose: 'registration', identityId: null, amountDuffs: '2', createdAt: 3000 })
    assetLockFundingAddressesRepository.findAllBroadcasted.mockResolvedValue([
      { address: 'yDeposit', assetLockTxid: ownTxid, used: false, purpose: 'registration' }
    ])

    const { assetLocks } = await list()

    expect(assetLocks.map((entry: any) => entry.createdAt)).toEqual([3000, 2000])
    expect(assetLocks).toHaveLength(2)
  })

  it('forgets an operation once it is finished', async () => {
    await pendingAssetLocksRepository.create({ assetLockTxid: ownTxid, fundingAddress: 'yOwnAddress', fundingTxid, purpose: 'registration', identityId: null, amountDuffs: '1', createdAt: 1000 })
    await pendingAssetLocksRepository.remove(ownTxid)

    expect(await list()).toEqual({ assetLocks: [] })
  })

  it('keeps entries of one wallet out of another', async () => {
    await pendingAssetLocksRepository.create({ assetLockTxid: ownTxid, fundingAddress: 'yOwnAddress', fundingTxid, purpose: 'registration', identityId: null, amountDuffs: '1', createdAt: 1000 })

    const otherWallet = pendingAssetLocksRepository.forScope({ network: 'testnet', walletId: `${walletId}-other` })

    expect(await otherWallet.getAll()).toEqual([])
  })
})

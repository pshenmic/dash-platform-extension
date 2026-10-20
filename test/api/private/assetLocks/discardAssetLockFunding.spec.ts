import { DiscardAssetLockFundingHandler } from '../../../../src/content-script/api/private/assetLocks/discardAssetLockFunding'
import { AssetLockFundingAddressesRepository } from '../../../../src/content-script/repository/AssetLockFundingAddressesRepository'
import { MemoryStorageAdapter } from '../../../../src/content-script/storage/memoryStorageAdapter'

// The way out of an operation stuck on a payment recorded before the signed
// transaction was kept. It must refuse while anything still has that
// transaction: discarding it then would pay the same address twice.
describe('discard asset lock funding', () => {
  const FUNDING_ADDRESS = 'yFundingAddress'
  const fundingTxid = 'd'.repeat(64)

  let storage: MemoryStorageAdapter
  let walletId: string
  let walletCounter = 0
  let repository: AssetLockFundingAddressesRepository
  let walletRepository: any
  let coreExplorer: any
  let coreSDK: any
  let handler: DiscardAssetLockFundingHandler

  const discard = async (): Promise<any> => await handler.handle({ payload: { fundingAddress: FUNDING_ADDRESS } } as any)

  const store = async (extra: Record<string, any> = {}): Promise<void> => {
    await storage.set(`assetLockFundingAddresses_testnet_${walletId}`, {
      [FUNDING_ADDRESS]: {
        address: FUNDING_ADDRESS, encryptedPrivateKey: 'k', used: false, purpose: 'topUp', ...extra
      }
    })
  }

  beforeEach(async () => {
    // The in-memory adapter keeps one module-level store, so each test gets its
    // own wallet instead of leaking entries into the next one.
    storage = new MemoryStorageAdapter()
    walletId = `wallet${++walletCounter}`

    await storage.set('network', 'testnet')
    await storage.set('currentWalletId', walletId)

    repository = new AssetLockFundingAddressesRepository(storage)
    walletRepository = { getCurrent: jest.fn(async () => ({ walletId, network: 'testnet' })) }
    coreExplorer = { hasTransaction: jest.fn(async () => false) }
    coreSDK = { getTransaction: jest.fn(async () => { throw new Error('Transaction not found') }) }

    handler = new DiscardAssetLockFundingHandler(walletRepository, repository, coreExplorer, coreSDK)
  })

  it('forgets a payment no node and no explorer has', async () => {
    await store({ fundingTxid, fundedAmountDuffs: '2000000', fundedAt: 1 })

    expect(await discard()).toEqual({ fundingAddress: FUNDING_ADDRESS, fundingTxid, amountDuffs: '2000000' })

    const entry = await repository.getByAddress(FUNDING_ADDRESS)

    expect(entry?.fundingTxid).toBeUndefined()
    expect(entry?.used).toBe(false)
  })

  it('refuses while a node has the payment', async () => {
    await store({ fundingTxid })
    coreSDK.getTransaction.mockResolvedValue({})

    await expect(discard()).rejects.toThrow('is on the network')

    expect((await repository.getByAddress(FUNDING_ADDRESS))?.fundingTxid).toBe(fundingTxid)
  })

  it('refuses while the explorer has the payment', async () => {
    await store({ fundingTxid })
    coreExplorer.hasTransaction.mockResolvedValue(true)

    await expect(discard()).rejects.toThrow('is indexed by the explorer')

    expect((await repository.getByAddress(FUNDING_ADDRESS))?.fundingTxid).toBe(fundingTxid)
  })

  // An explorer that cannot answer must not read as "the payment never happened".
  it('refuses while the explorer cannot be reached', async () => {
    await store({ fundingTxid })
    coreExplorer.hasTransaction.mockRejectedValue(new Error('Core explorer error for transaction: HTTP 502'))

    await expect(discard()).rejects.toThrow('HTTP 502')

    expect((await repository.getByAddress(FUNDING_ADDRESS))?.fundingTxid).toBe(fundingTxid)
  })

  it('refuses a payment that can simply be sent again', async () => {
    await store({ fundingTxid, fundingTxHex: 'deadbeef' })

    await expect(discard()).rejects.toThrow('can be sent again')

    expect(coreSDK.getTransaction).not.toHaveBeenCalled()
  })

  it('refuses an address with no recorded payment, and an unknown one', async () => {
    await store()

    await expect(discard()).rejects.toThrow('has no recorded payment')

    await storage.set(`assetLockFundingAddresses_testnet_${walletId}`, {})

    await expect(discard()).rejects.toThrow('is not known on testnet')
  })

  it('refuses once an asset lock spends the deposit', async () => {
    await store({ fundingTxid, assetLockTxid: 'a'.repeat(64) })

    await expect(discard()).rejects.toThrow('cannot be unfunded')
  })

  it('validates the payload', () => {
    expect(handler.validatePayload({ fundingAddress: '' } as any)).toMatch('fundingAddress')
    expect(handler.validatePayload({ fundingAddress: FUNDING_ADDRESS } as any)).toBeNull()
  })
})

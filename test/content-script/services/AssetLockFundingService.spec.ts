import { AssetLockFundingService } from '../../../src/content-script/services/AssetLockFundingService'

const FUNDING_ADDRESS = 'yFundingAddress'
const XPUB = 'tpubAccountXpub'

describe('AssetLockFundingService', () => {
  const wallet: any = { walletId: 'wallet1', type: 'seedphrase', network: 'testnet' }

  let coreExplorer: any
  let coreSpend: any
  let corePendingSpendsRepository: any
  let assetLockFundingAddressesRepository: any
  let service: AssetLockFundingService

  const prepared = {
    txid: 'b'.repeat(64),
    feeDuffs: 226n,
    changeDuffs: 89_774n,
    resolvedTxids: ['c'.repeat(64)]
  }

  const fund = async (amountDuffs = 100_000n): Promise<any> => await service.fundFromWallet({
    wallet,
    xpub: XPUB,
    fundingAddress: FUNDING_ADDRESS,
    amountDuffs,
    password: 'test',
    assetLockFundingAddressesRepository
  })

  beforeEach(() => {
    jest.clearAllMocks()

    coreExplorer = { getAddressUtxos: jest.fn(async () => []) }
    coreSpend = {
      prepare: jest.fn(async () => prepared),
      broadcast: jest.fn(async () => {})
    }
    corePendingSpendsRepository = { remove: jest.fn(async () => {}) }
    assetLockFundingAddressesRepository = {
      getByAddress: jest.fn(async () => ({ address: FUNDING_ADDRESS, used: false })),
      markAsFunded: jest.fn(async () => {})
    }

    service = new AssetLockFundingService(coreExplorer, coreSpend, corePendingSpendsRepository)
  })

  it('pays the funding address out of the wallet and reports the transaction', async () => {
    const result = await fund()

    expect(coreSpend.prepare).toHaveBeenCalledWith({
      wallet, xpub: XPUB, account: 0, outputs: [{ address: FUNDING_ADDRESS, amountDuffs: 100_000n }], password: 'test'
    })
    expect(coreSpend.broadcast).toHaveBeenCalledWith(prepared)
    expect(result).toEqual({ fundingTxid: prepared.txid, paid: true, feeDuffs: 226n, changeDuffs: 89_774n })
  })

  it('writes the payment down before it reaches the network', async () => {
    const order: string[] = []

    assetLockFundingAddressesRepository.markAsFunded.mockImplementation(async () => { order.push('markAsFunded') })
    coreSpend.broadcast.mockImplementation(async () => { order.push('broadcast') })

    await fund()

    expect(assetLockFundingAddressesRepository.markAsFunded).toHaveBeenCalledWith(FUNDING_ADDRESS, prepared.txid)
    expect(order).toEqual(['markAsFunded', 'broadcast'])
  })

  it('forgets pending spends the explorer has caught up with', async () => {
    await fund()

    expect(corePendingSpendsRepository.remove).toHaveBeenCalledWith(prepared.resolvedTxids)
  })

  it('pays nothing when the recorded payment is already on its way', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValue({
      address: FUNDING_ADDRESS, used: false, fundingTxid: 'd'.repeat(64)
    })

    expect(await fund()).toEqual({ fundingTxid: 'd'.repeat(64), paid: false, feeDuffs: 0n, changeDuffs: 0n })
    expect(coreSpend.prepare).not.toHaveBeenCalled()
  })

  it('picks up a deposit nothing recorded, and records it', async () => {
    coreExplorer.getAddressUtxos.mockResolvedValue([
      { txid: 'e'.repeat(64), vout: 0, amount: 70_000n },
      { txid: 'e'.repeat(64), vout: 1, amount: 30_000n }
    ])

    expect(await fund()).toEqual({ fundingTxid: 'e'.repeat(64), paid: false, feeDuffs: 0n, changeDuffs: 0n })
    expect(assetLockFundingAddressesRepository.markAsFunded).toHaveBeenCalledWith(FUNDING_ADDRESS, 'e'.repeat(64))
    expect(coreSpend.prepare).not.toHaveBeenCalled()
  })

  it('refuses to choose between deposits from several transactions', async () => {
    coreExplorer.getAddressUtxos.mockResolvedValue([
      { txid: 'e'.repeat(64), vout: 0, amount: 70_000n },
      { txid: 'f'.repeat(64), vout: 0, amount: 30_000n }
    ])

    await expect(fund()).rejects.toThrow('holds deposits from several transactions')
    expect(coreSpend.prepare).not.toHaveBeenCalled()
  })

  it('refuses an address whose asset lock is already on L1 with no funding transaction recorded', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValue({
      address: FUNDING_ADDRESS, used: false, assetLockTxid: 'a'.repeat(64)
    })

    await expect(fund()).rejects.toThrow('already has an asset lock on L1')
    expect(coreSpend.prepare).not.toHaveBeenCalled()
  })

  it('pays an address that has no local entry at all', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValue(null)

    expect((await fund()).paid).toBe(true)
    expect(assetLockFundingAddressesRepository.markAsFunded).not.toHaveBeenCalled()
  })
})

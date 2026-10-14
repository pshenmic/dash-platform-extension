import { AssetLockService } from '../../../src/content-script/services/AssetLockService'
import { buildAssetLockFromFundingTx } from '../../../src/utils/buildAssetLockFromFundingTx'
import { waitForAssetLockProof } from '../../../src/utils/waitForAssetLockProof'

jest.mock('../../../src/utils/buildAssetLockFromFundingTx', () => ({
  buildAssetLockFromFundingTx: jest.fn()
}))
jest.mock('../../../src/utils/waitForAssetLockProof', () => ({
  waitForAssetLockProof: jest.fn()
}))

jest.mock('pshenmic-dpp', () => {
  const actual = jest.requireActual('pshenmic-dpp')
  return {
    ...actual,
    AssetLockProofWASM: {
      ...actual.AssetLockProofWASM,
      createInstantAssetLockProof: jest.fn(() => ({ kind: 'instant' })),
      createChainAssetLockProof: jest.fn(() => ({ kind: 'chain' }))
    },
    OutPointWASM: jest.fn((txid, index) => ({ txid, index }))
  }
})

const buildAssetLockFromFundingTxMock = buildAssetLockFromFundingTx as jest.MockedFunction<typeof buildAssetLockFromFundingTx>
const waitForAssetLockProofMock = waitForAssetLockProof as jest.MockedFunction<typeof waitForAssetLockProof>

const FUNDING_ADDRESS = 'yFundingAddress'
const FUNDING_TXID = 'b'.repeat(64)
const ASSET_LOCK_TXID = 'c'.repeat(64)

describe('AssetLockService', () => {
  const wallet: any = { walletId: 'wallet1', type: 'seedphrase', network: 'testnet' }

  let sdk: any
  let coreSDK: any
  let assetLockFundingAddressesRepository: any
  let pendingAssetLocksRepository: any
  let service: AssetLockService

  const commit = async (): Promise<any> => await service.commit({
    wallet,
    fundingAddress: FUNDING_ADDRESS,
    fundingTxid: FUNDING_TXID,
    fundingKey: { WIF: () => 'fundingWif' } as any,
    creditOutputAddress: FUNDING_ADDRESS,
    purpose: 'shield',
    identityId: null,
    platformAddress: null,
    assetLockFundingAddressesRepository,
    pendingAssetLocksRepository
  })

  beforeEach(() => {
    jest.clearAllMocks()

    buildAssetLockFromFundingTxMock.mockResolvedValue({
      assetLockTx: { hash: () => ASSET_LOCK_TXID, bytes: () => new Uint8Array([1, 2, 3]) },
      assetLockOutputIndex: 0,
      lockedAmount: 99_999_000n
    } as any)

    waitForAssetLockProofMock.mockResolvedValue({
      type: 'instantLock', instantLock: 'aa', transaction: 'bb', outputIndex: 0
    } as any)

    sdk = {}
    coreSDK = {
      subscribeToTransactions: jest.fn(() => 'subscription'),
      broadcastTransaction: jest.fn(async () => {}),
      getTransaction: jest.fn(async () => null)
    }

    assetLockFundingAddressesRepository = {
      getByAddress: jest.fn(async () => ({ address: FUNDING_ADDRESS, encryptedPrivateKey: 'k', used: false })),
      markAsBroadcasted: jest.fn(async () => {})
    }
    pendingAssetLocksRepository = { create: jest.fn(async () => {}) }

    service = new AssetLockService(sdk, coreSDK)
  })

  it('builds the asset lock, broadcasts it and returns the proof', async () => {
    const result = await commit()

    expect(buildAssetLockFromFundingTxMock).toHaveBeenCalledWith(coreSDK, FUNDING_TXID, FUNDING_ADDRESS, 'fundingWif', FUNDING_ADDRESS)
    expect(coreSDK.broadcastTransaction).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      assetLockTxid: ASSET_LOCK_TXID,
      lockedAmount: 99_999_000n,
      assetLockProof: { kind: 'instant' }
    })
  })

  it('writes down what was started before the transaction can reach the network', async () => {
    const order: string[] = []

    pendingAssetLocksRepository.create.mockImplementation(async () => { order.push('pending') })
    coreSDK.broadcastTransaction.mockImplementation(async () => { order.push('broadcast') })
    assetLockFundingAddressesRepository.markAsBroadcasted.mockImplementation(async () => { order.push('markBroadcasted') })

    await commit()

    expect(order).toEqual(['pending', 'broadcast', 'markBroadcasted'])
    expect(pendingAssetLocksRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      assetLockTxid: ASSET_LOCK_TXID,
      fundingAddress: FUNDING_ADDRESS,
      fundingTxid: FUNDING_TXID,
      purpose: 'shield',
      amountDuffs: '99999000'
    }))
  })

  it('does not broadcast again when the same asset lock is already on L1', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValue({
      address: FUNDING_ADDRESS, encryptedPrivateKey: 'k', used: false, assetLockTxid: ASSET_LOCK_TXID
    })

    await commit()

    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
    expect(pendingAssetLocksRepository.create).not.toHaveBeenCalled()
    expect(waitForAssetLockProofMock).toHaveBeenCalled()
  })

  it('refuses an entry whose asset lock differs from the rebuilt one', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValue({
      address: FUNDING_ADDRESS, encryptedPrivateKey: 'k', used: false, assetLockTxid: 'd'.repeat(64)
    })

    await expect(commit()).rejects.toThrow('already broadcasted with a different asset lock txid')
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  it('accepts the network rejecting a transaction it already has', async () => {
    coreSDK.broadcastTransaction.mockRejectedValue(new Error('transaction already in block chain'))
    coreSDK.getTransaction.mockResolvedValue({ transaction: [1, 2, 3] })

    await expect(commit()).resolves.toEqual(expect.objectContaining({ assetLockTxid: ASSET_LOCK_TXID }))
  })

  it('propagates a broadcast failure the network has no transaction for', async () => {
    coreSDK.broadcastTransaction.mockRejectedValue(new Error('bad-txns-inputs-missingorspent'))

    await expect(commit()).rejects.toThrow('bad-txns-inputs-missingorspent')
  })

  it('builds a chain lock proof when that is what the wait returned', async () => {
    waitForAssetLockProofMock.mockResolvedValue({
      type: 'chainLock', coreChainLockedHeight: 1337, outputIndex: 0
    } as any)

    expect((await commit()).assetLockProof).toEqual({ kind: 'chain' })
  })
})

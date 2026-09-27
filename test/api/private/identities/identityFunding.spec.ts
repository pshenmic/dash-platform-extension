import { DashPlatformSDK } from 'dash-platform-sdk'
import { Transaction, Output } from 'dash-core-sdk'
import { PrivateKey, encrypt } from 'eciesjs'
import hash from 'hash.js'
import { IdentityFundingService } from '../../../../src/content-script/services/IdentityFundingService'
import { PrepareIdentityFundingHandler } from '../../../../src/content-script/api/private/identities/prepareIdentityFunding'
import { ExecuteIdentityFundingHandler } from '../../../../src/content-script/api/private/identities/executeIdentityFunding'
import { CancelIdentityFundingHandler } from '../../../../src/content-script/api/private/identities/cancelIdentityFunding'
import { GetIdentityFundingSourcesHandler } from '../../../../src/content-script/api/private/identities/getIdentityFundingSources'
import { findConflictingFunding } from '../../../../src/content-script/api/fundingConflicts'
import { MessagingMethods } from '../../../../src/types/enums/MessagingMethods'
import { IdentitiesRepository } from '../../../../src/content-script/repository/IdentitiesRepository'
import { WalletRepository } from '../../../../src/content-script/repository/WalletRepository'
import { bytesToHex, utf8ToBytes, derivePlatformAccountXpub, derivePlatformAddressesFromXpub } from '../../../../src/utils'
import { deriveCoreAccountXpub, deriveCoreAddressesFromXpub } from '../../../../src/utils/coreAddresses'
import { CoreAddressChain } from '../../../../src/types/enums/CoreAddressChain'
import { WalletType } from '../../../../src/types/WalletType'
import { PrepareIdentityFundingPayload } from '../../../../src/types/messages/payloads/PrepareIdentityFundingPayload'
import { waitForAssetLockProof } from '../../../../src/utils/waitForAssetLockProof'
import { IsolatedStorage, installWebLocks } from '../../../helpers/isolatedStorage'

jest.mock('../../../../src/utils/waitForAssetLockProof', () => ({ waitForAssetLockProof: jest.fn() }))
const proofMock = waitForAssetLockProof as jest.Mock
const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const password = 'test-password'
const scope = { walletId: 'wallet1', network: 'testnet' as const }
const identityId = 'HT3pUBM1Uv2mKgdPEN1gxa7A4PdsvNY89aJbdSKQb5wR'

describe('identity funding handlers', () => {
  let storage: IsolatedStorage
  let sdk: DashPlatformSDK
  let core: any
  let explorer: any
  let service: IdentityFundingService
  let walletRepository: WalletRepository
  let restoreLocks: () => void
  let request: PrepareIdentityFundingPayload
  let platformAddress: string

  beforeAll(() => { restoreLocks = installWebLocks() })
  afterAll(() => { restoreLocks() })
  beforeEach(async () => {
    jest.clearAllMocks()
    storage = new IsolatedStorage()
    sdk = new DashPlatformSDK({ network: 'testnet', grpc: { poolLimit: 5, dapiUrl: 'http://127.0.0.1:1' } })
    const publicKey = PrivateKey.fromHex(hash.sha256().update(password).digest('hex')).publicKey.toHex()
    const wallet = { ...scope, type: WalletType.seedphrase, encryptedMnemonic: bytesToHex(encrypt(publicKey, utf8ToBytes(mnemonic))), seedHash: null, label: null, currentIdentity: null }
    const xpub = await deriveCoreAccountXpub(wallet, password, 0, sdk)
    const platformXpub = await derivePlatformAccountXpub(wallet, password, 0, sdk)
    platformAddress = derivePlatformAddressesFromXpub(sdk, platformXpub, 'testnet', 0, 1)[0].address
    await storage.set('network', 'testnet')
    await storage.set('currentWalletId', scope.walletId)
    await storage.set('wallet_testnet_wallet1', { ...wallet, coreXpubs: { 0: xpub }, platformXpubs: { 0: platformXpub }, platformAddressCounts: { 0: 1 } })
    walletRepository = new WalletRepository(storage, new IdentitiesRepository(storage, sdk))
    const receiving = deriveCoreAddressesFromXpub(sdk, xpub, 'testnet', 0, CoreAddressChain.receiving, 1)[0]
    const change = deriveCoreAddressesFromXpub(sdk, xpub, 'testnet', 0, CoreAddressChain.change, 1)[0]
    const parents = [receiving, change].map((entry, index) => new Transaction([], [Output.createP2PKH(2000000n + BigInt(index), entry.address)]))
    core = {
      network: 'testnet',
      getTransaction: jest.fn(async (txid: string) => {
        const tx = parents.find(tx => tx.hash() === txid)
        if (tx == null) throw new Error('Not found')
        return { transaction: tx.bytes(), confirmations: 6, isChainLocked: true, height: 100 }
      }),
      broadcastTransaction: jest.fn(async () => {}),
      subscribeToTransactions: jest.fn(() => ({ async * [Symbol.asyncIterator] () {} }))
    }
    explorer = {
      getXpubSummary: jest.fn(async () => ({ nextUnused: { receiving: 0, change: 0 }, balance: 4000001n })),
      getXpubUtxos: jest.fn(async () => parents.map(tx => ({ address: tx.outputs[0].getAddress('testnet'), txid: tx.hash(), vout: 0, amount: tx.outputs[0].satoshis }))),
      isAddressUsed: jest.fn(async () => false)
    }
    jest.spyOn(sdk.identities, 'getIdentityByPublicKeyHash').mockResolvedValue(null as any)
    jest.spyOn(sdk.identities, 'getIdentityByNonUniquePublicKeyHash').mockResolvedValue(null as any)
    jest.spyOn(sdk.platformAddresses, 'getAddressesInfos').mockResolvedValue([{ address: { toBech32m: () => platformAddress }, balance: 10000000000n, nonce: 7 }] as any)
    jest.spyOn(sdk.stateTransitions, 'broadcast').mockResolvedValue(undefined)
    jest.spyOn(sdk.stateTransitions, 'waitForStateTransitionResult').mockResolvedValue(undefined)
    proofMock.mockImplementation(async (_core, _sdk, _tx, txid) => ({ type: 'chainLock', txid, outputIndex: 0, coreChainLockedHeight: 100 }))
    service = new IdentityFundingService(walletRepository, sdk, core, explorer)
    jest.spyOn(service, 'clientsFor').mockReturnValue({ sdk, core })
    request = { ...scope, operationId: 'operation-0000000001', source: 'core', kind: 'topUp', amountCredits: '3000000000', password, identityId }
  })

  const call = async (handler: { handle: (event: any) => Promise<any> }, payload: any): Promise<any> =>
    await handler.handle({ context: 'dash-platform-extension', id: 'id', method: 'IDENTITY_FUNDING', type: 'request', payload })
  const prepare = async (payload: PrepareIdentityFundingPayload): Promise<any> => await call(new PrepareIdentityFundingHandler(walletRepository, service), payload)
  const execute = async (): Promise<any> => await call(new ExecuteIdentityFundingHandler(walletRepository, service, request.source, request.kind), { ...scope, operationId: request.operationId, password })
  const cancel = async (operationId: string): Promise<any> => await call(new CancelIdentityFundingHandler(service), { ...scope, operationId })
  const sources = async (): Promise<any> => await call(new GetIdentityFundingSourcesHandler(walletRepository, service), scope)
  // A registration paid from a Platform address, the request shape PR A adds.
  const platformRequest = (overrides: Partial<PrepareIdentityFundingPayload> = {}): PrepareIdentityFundingPayload =>
    ({ ...request, source: 'platform', kind: 'registration', identityId: undefined, amountCredits: '3000000000', ...overrides })
  // Signed bytes stay in the journal: the handlers never return them.
  const stored = async (operationId: string): Promise<any> => await service.repository(scope).get(operationId)

  test('prepares a multi-address asset lock without network writes or stored secrets', async () => {
    const operation = await prepare(request)
    expect(operation.corePlan?.inputs).toHaveLength(2)
    expect(new Set(operation.corePlan?.inputs.map(input => input.chain)).size).toBe(2)
    expect(operation.corePlan?.creditOutputAddress).not.toBe(operation.corePlan?.inputs[0].address)
    expect(core.broadcastTransaction).not.toHaveBeenCalled()
    expect(sdk.stateTransitions.broadcast).not.toHaveBeenCalled()
    const journal = JSON.stringify(await service.repository(scope).getAll())
    expect(journal).not.toContain(mnemonic)
    expect(journal).not.toContain(password)
    expect(journal).not.toContain('privateKey')
    expect((await prepare(request)).assetLockTxid).toBe(operation.assetLockTxid)
  })

  test('reserves inputs and indexes atomically for simultaneous prepares', async () => {
    const results = await Promise.allSettled([prepare(request), prepare({ ...request, operationId: 'operation-0000000002' })])
    expect(results.map(result => result.status).sort()).toEqual(['fulfilled', 'rejected'])
    expect(await service.repository(scope).getAll()).toHaveLength(1)
  })

  test('resumes the same raw tx after proof timeout, preserving wallet/network and all indexes', async () => {
    const initial = await prepare(request)
    proofMock.mockRejectedValueOnce(new Error('Proof timeout'))
    await expect(execute()).rejects.toThrow('Proof timeout')
    await storage.set('network', 'mainnet')
    await storage.set('currentWalletId', 'other-wallet')
    const retry = await execute()
    expect(retry.status).toBe('completed')
    expect(retry.assetLockTxid).toBe(initial.assetLockTxid)
    expect(retry.topUpIndex).toBe(initial.topUpIndex)
    expect(retry.changeIndex).toBe(initial.changeIndex)
    expect(await storage.get('identityFunding_mainnet_other-wallet')).toBeNull()
    expect(await execute()).toEqual(retry)
    // The network took the asset lock the first time; a retry never re-sends it.
    expect(core.broadcastTransaction).toHaveBeenCalledTimes(1)
    expect(sdk.stateTransitions.broadcast).toHaveBeenCalledTimes(1)
  })

  test('stores Core and Platform bytes before each broadcast and recovers a lost Core response', async () => {
    const operation = await prepare(request)
    core.broadcastTransaction.mockImplementationOnce(async () => {
      const saved = await service.repository(scope).get(operation.id)
      expect(saved?.status).toBe('coreBroadcast')
      expect(saved?.coreTransaction).toBe((await stored(operation.id)).coreTransaction)
      throw new Error('Connection closed after broadcast')
    })
    core.getTransaction.mockResolvedValue({ transaction: Transaction.fromHex((await stored(operation.id)).coreTransaction).bytes() })
    ;(sdk.stateTransitions.broadcast as jest.Mock).mockImplementation(async transition => {
      const saved = await service.repository(scope).get(operation.id)
      expect(saved?.status).toBe('platformBroadcast')
      expect(saved?.stateTransitionHash).toBe(transition.hash(false))
    })
    expect((await execute()).status).toBe('completed')
  })

  test('does not treat a consumed-asset-lock error as success or spend another lock on retry', async () => {
    const quote = await prepare(request)
    ;(sdk.stateTransitions.broadcast as jest.Mock).mockRejectedValueOnce(new Error('Asset lock already consumed'))

    await expect(execute()).rejects.toThrow('Asset lock already consumed')
    const pending = await stored(request.operationId)
    // Not completed, not failed: the lock is on L1 and awaits a fresh transition.
    expect(pending.status).toBe('proving')
    expect(pending.error).toBe('Asset lock already consumed')
    await expect(cancel(request.operationId)).rejects.toThrow('Only an unsubmitted')

    expect((await execute()).status).toBe('completed')
    expect((await stored(request.operationId)).assetLockTxid).toBe(quote.assetLockTxid)
    expect(core.broadcastTransaction).toHaveBeenCalledTimes(1)
    expect(sdk.stateTransitions.broadcast).toHaveBeenCalledTimes(2)
  })

  test('cancels an unsubmitted quote, releases UTXO and keeps key/change indexes monotonic', async () => {
    const first = await prepare(request)
    await cancel(first.id)
    const second = await prepare({ ...request, operationId: 'operation-0000000002' })
    expect(second.topUpIndex).toBe((first.topUpIndex as number) + 1)
    expect(second.changeIndex).toBe((first.changeIndex as number) + 1)
    expect(second.corePlan?.inputs).toEqual(first.corePlan?.inputs)
    await expect(execute()).rejects.toThrow('cancelled')
  })

  test('rejects foreign or inconsistent outpoints before reserving or broadcasting', async () => {
    const [owned] = await explorer.getXpubUtxos()
    explorer.getXpubUtxos.mockResolvedValue([{ address: owned.address, txid: 'f'.repeat(64), vout: 0, amount: 9000000n }])
    await expect(prepare(request)).rejects.toThrow()
    expect(await service.repository(scope).getAll()).toEqual([])
    expect(core.broadcastTransaction).not.toHaveBeenCalled()
  })

  test('Core registration saves a confirmed identity in its pinned wallet', async () => {
    request = { ...request, kind: 'registration', identityId: undefined }
    const quote = await prepare(request)
    ;(sdk.identities.getIdentityByPublicKeyHash as jest.Mock).mockResolvedValue({ id: { base58: () => identityId } })
    const result = await execute()
    expect(result.identityIndex).toBe(quote.identityIndex)
    expect(result.identityId).toBe(identityId)
    expect((await walletRepository.forScope(scope).getCurrent())?.currentIdentity).toBe(identityId)
    expect(await new IdentitiesRepository(storage, sdk, scope).getAll()).toHaveLength(1)
  })

  test('a Core transaction the network refused fails the operation and frees its inputs', async () => {
    const first = await prepare(request)
    core.broadcastTransaction.mockRejectedValueOnce(new Error('bad-txns-inputs-missingorspent'))
    core.getTransaction.mockImplementation(async (txid: string) => {
      if (txid === first.assetLockTxid) {
        throw new Error('Transaction not found')
      }
      throw new Error('Not found')
    })

    await expect(execute()).rejects.toThrow('bad-txns-inputs-missingorspent')
    expect((await service.repository(scope).get(first.id))?.status).toBe('failed')
  })

  test('a transition Platform rejected on a Core asset lock is rebuilt on the same lock with a ChainLock proof', async () => {
    const quote = await prepare(request)
    ;(sdk.stateTransitions.broadcast as jest.Mock).mockRejectedValueOnce(new Error('Instant lock proof is too old'))

    await expect(execute()).rejects.toThrow('too old')
    const recovering = await stored(quote.id)
    expect(recovering.status).toBe('proving')
    expect(recovering.chainLockProofOnly).toBe(true)
    expect(recovering.assetLockProof).toBeUndefined()
    expect(recovering.stateTransition).toBeUndefined()
    expect(recovering.assetLockTxid).toBe(quote.assetLockTxid)
    expect(recovering.topUpIndex).toBe(quote.topUpIndex)

    const done = await execute()
    expect(done.status).toBe('completed')
    // Same lock: the Core transaction went out once, the proof was awaited again
    // without an InstantLock stream.
    expect(core.broadcastTransaction).toHaveBeenCalledTimes(1)
    expect(core.subscribeToTransactions).toHaveBeenCalledTimes(1)
    expect(proofMock).toHaveBeenCalledTimes(2)
  })
  test('quotes a Platform registration against the funding address without writing anywhere', async () => {
    const operation = await prepare(platformRequest())

    expect(operation.fromAddress).toBe(platformAddress)
    expect(operation.balanceCredits).toBe('10000000000')
    expect(BigInt(operation.feeCredits as string)).toBeGreaterThan(0n)
    // A Platform source signs its transition now, so nothing is left to build.
    expect((await stored(operation.id)).stateTransition).toBeDefined()
    expect(operation.assetLockTxid).toBeUndefined()
    expect(core.broadcastTransaction).not.toHaveBeenCalled()
    expect(sdk.stateTransitions.broadcast).not.toHaveBeenCalled()
    // The nonce is signed into those bytes, so a repeat prepare must not re-sign.
    expect((await prepare(platformRequest())).stateTransitionHash).toBe(operation.stateTransitionHash)
  })

  test('confirms a Platform registration by sending exactly the signed bytes', async () => {
    const quote = await prepare(platformRequest())
    const saved = (await stored(quote.id)).stateTransition
    ;(sdk.identities.getIdentityByPublicKeyHash as jest.Mock).mockResolvedValue({ id: { base58: () => identityId } })

    request = { ...platformRequest() }
    const result = await execute()

    expect(result.identityId).toBe(identityId)
    expect(result.status).toBe('completed')
    expect((sdk.stateTransitions.broadcast as jest.Mock).mock.calls[0][0].hex()).toBe(saved)
    // The Core side is untouched: this source never builds an asset lock.
    expect(core.broadcastTransaction).not.toHaveBeenCalled()
    expect(proofMock).not.toHaveBeenCalled()
  })

  test('validates the source address before anything is selected', async () => {
    const handler = new PrepareIdentityFundingHandler(walletRepository, service)

    expect(handler.validatePayload(platformRequest({ fromAddress: '' }))).toMatch(/Platform source address/)
    expect(handler.validatePayload(platformRequest({ fromAddress: 42 as any }))).toMatch(/Platform source address/)
    // A Core operation has no address to pick.
    expect(handler.validatePayload({ ...request, fromAddress: platformAddress })).toMatch(/Platform source address/)
    expect(handler.validatePayload(platformRequest({ fromAddress: platformAddress }))).toBeNull()
  })

  test('refuses a source address the wallet does not own', async () => {
    await expect(prepare(platformRequest({ fromAddress: 'tdash1notours' })))
      .rejects.toThrow(/not/)
    expect(await service.repository(scope).getAll()).toHaveLength(0)
  })

  test('holds the address nonce against other spends while the operation is pending', async () => {
    await prepare(platformRequest())
    const operations = await service.repository(scope).getAll()

    expect(findConflictingFunding(MessagingMethods.SEND_PLATFORM_TRANSFER, operations)?.source).toBe('platform')
    expect(findConflictingFunding(MessagingMethods.SHIELD_TO_POOL, operations)?.source).toBe('platform')
    // Reads and other funds are untouched by the reservation.
    expect(findConflictingFunding(MessagingMethods.GET_CORE_BALANCE, operations)).toBeUndefined()
  })

  test('lists both sources with their balances, each reporting its own failure', async () => {
    const result = await sources()

    expect(result.platform.addresses).toEqual([{ address: platformAddress, balanceCredits: '10000000000' }])
    expect(result.platform.error).toBeUndefined()

    explorer.getXpubSummary.mockRejectedValueOnce(new Error('explorer down'))
    const degraded = await sources()

    expect(degraded.core.error).toContain('explorer down')
    expect(degraded.platform.addresses).toHaveLength(1)
  })
  test('quotes a Platform top-up of an existing identity against the same address', async () => {
    const operation = await prepare(platformRequest({ kind: 'topUp', identityId, operationId: 'operation-0000000003' }))

    expect(operation.kind).toBe('topUp')
    expect(operation.identityId).toBe(identityId)
    expect(operation.fromAddress).toBe(platformAddress)
    expect((await stored(operation.id)).stateTransition).toBeDefined()
    // A top-up needs no identity key and no index: the identity already exists.
    expect(operation.identityIndex).toBeUndefined()
    expect(sdk.stateTransitions.broadcast).not.toHaveBeenCalled()
  })

  test('confirms a Platform top-up by sending the signed bytes and keeps the identity', async () => {
    request = platformRequest({ kind: 'topUp', identityId, operationId: 'operation-0000000003' })
    const quote = await prepare(request)
    const saved = (await stored(quote.id)).stateTransition

    const result = await execute()

    expect(result.status).toBe('completed')
    expect(result.identityId).toBe(identityId)
    expect((sdk.stateTransitions.broadcast as jest.Mock).mock.calls[0][0].hex()).toBe(saved)
    // Crediting an identity creates nothing, so no identity lookup is made.
    expect(sdk.identities.getIdentityByPublicKeyHash).not.toHaveBeenCalled()
    expect(core.broadcastTransaction).not.toHaveBeenCalled()
  })

  test('refuses a Platform top-up without a valid identity', async () => {
    const handler = new PrepareIdentityFundingHandler(walletRepository, service)

    expect(handler.validatePayload(platformRequest({ kind: 'topUp', identityId: undefined }))).toMatch(/identity/i)
    expect(handler.validatePayload(platformRequest({ kind: 'topUp', identityId: 'not-an-identifier' }))).toMatch(/identity/i)
    expect(handler.validatePayload(platformRequest({ kind: 'topUp', identityId }))).toBeNull()
  })

  test('keeps a pending top-up from being confirmed as a registration', async () => {
    request = platformRequest({ kind: 'topUp', identityId, operationId: 'operation-0000000003' })
    await prepare(request)

    const asRegistration = new ExecuteIdentityFundingHandler(walletRepository, service, 'platform', 'registration')

    await expect(call(asRegistration, { ...scope, operationId: request.operationId, password }))
      .rejects.toThrow('Funding operation does not match this request')
  })
})

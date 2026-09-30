import { PrivateKeyWASM } from 'dash-platform-sdk/types'
import { RegisterIdentityHandler } from '../../../../src/content-script/api/private/identities/registerIdentity'
import { buildAssetLockFromFundingTx } from '../../../../src/utils/buildAssetLockFromFundingTx'
import { waitForAssetLockProof } from '../../../../src/utils/waitForAssetLockProof'
import { deriveCoreAddressKey } from '../../../../src/utils/coreAddresses'
import { WalletType } from '../../../../src/types'

jest.mock('../../../../src/utils/buildAssetLockFromFundingTx', () => ({
  buildAssetLockFromFundingTx: jest.fn()
}))

jest.mock('../../../../src/utils/waitForAssetLockProof', () => ({
  waitForAssetLockProof: jest.fn()
}))

jest.mock('../../../../src/utils/coreAddresses', () => {
  const actual = jest.requireActual('../../../../src/utils/coreAddresses')
  return {
    ...actual,
    deriveCoreAddressKey: jest.fn()
  }
})

jest.mock('../../../../src/utils/identityRegistration', () => ({
  IDENTITY_KEY_DEFINITIONS: [{ id: 0 }],
  buildIdentityCreateTransition: jest.fn()
}))

jest.mock('../../../../src/utils', () => {
  const actual = jest.requireActual('../../../../src/utils')
  return {
    ...actual,
    deriveIdentityPrivateKey: jest.fn(),
    deriveIdentityRegistrationKey: jest.fn()
  }
})

const buildAssetLockFromFundingTxMock = buildAssetLockFromFundingTx as jest.MockedFunction<typeof buildAssetLockFromFundingTx>
const waitForAssetLockProofMock = waitForAssetLockProof as jest.MockedFunction<typeof waitForAssetLockProof>
const deriveCoreAddressKeyMock = deriveCoreAddressKey as jest.MockedFunction<typeof deriveCoreAddressKey>
const { buildIdentityCreateTransition } = jest.requireMock('../../../../src/utils/identityRegistration')
const { deriveIdentityRegistrationKey, deriveIdentityPrivateKey } = jest.requireMock('../../../../src/utils')

// Funding an asset lock with one of the wallet's own Core outputs: the caller
// names the address and the transaction that paid it, exactly as it does for a
// deposit, and the key comes from the seed instead of a stored one-off entry.
// Everything after the key is develop's pipeline, so what is covered here is the
// key, the record, and that nothing else changed shape.
describe('RegisterIdentityHandler funded from an own Core output', () => {
  const identifier = 'HT3pUBM1Uv2mKgdPEN1gxa7A4PdsvNY89aJbdSKQb5wR'
  const ownAddress = 'yTtgx2GriUKCECox9NWe9eutk7hFU5Hb8j'
  const creditAddress = 'yjLG5HeifV72L78cr6EW4sEC9AATZnmLXA'
  const fundingTxid = 'a'.repeat(64)
  const assetLockTxid = 'b'.repeat(64)
  const password = 'test'

  let stored: any[]
  let walletRepository: any
  let identitiesRepository: any
  let assetLockFundingAddressesRepository: any
  let coreSDK: any
  let sdk: any
  let handler: RegisterIdentityHandler

  beforeEach(() => {
    jest.clearAllMocks()
    stored = []

    walletRepository = {
      getCurrent: jest.fn(async () => ({
        walletId: 'wallet1',
        network: 'testnet',
        type: WalletType.seedphrase,
        encryptedMnemonic: 'encryptedMnemonic',
        seedHash: null,
        label: null,
        currentIdentity: null
      })),
      switchIdentity: jest.fn(async () => {}),
      getCoreAccountXpub: jest.fn(async () => 'xpub')
    }

    identitiesRepository = {
      getByIdentifier: jest.fn(async () => null),
      create: jest.fn(async () => ({ identifier })),
      remove: jest.fn(async () => {}),
      getAll: jest.fn(async () => [])
    }

    assetLockFundingAddressesRepository = {
      findAllUnused: jest.fn(async () => stored.filter(entry => entry.used !== true)),
      getByAddress: jest.fn(async (address: string) => stored.find(entry => entry.address === address) ?? null),
      create: jest.fn(async (entry: any) => {
        stored.push(entry)
        return entry
      }),
      markAsBroadcasted: jest.fn(async (address: string, txid: string, index?: number) => {
        const entry = stored.find(candidate => candidate.address === address)
        entry.assetLockTxid = txid
        entry.registrationIdentityIndex = index
      }),
      markAsUsed: jest.fn(async (address: string) => {
        stored.find(candidate => candidate.address === address).used = true
      })
    }

    coreSDK = {
      broadcastTransaction: jest.fn(async () => {}),
      subscribeToTransactions: jest.fn(() => ({ async * [Symbol.asyncIterator] () {} }))
    }

    sdk = {
      keyPair: { p2pkhAddress: jest.fn(() => creditAddress) },
      identities: {
        getIdentityByPublicKeyHash: jest.fn(async () => null),
        getIdentityByNonUniquePublicKeyHash: jest.fn(async () => null)
      },
      stateTransitions: {
        broadcast: jest.fn(async () => {}),
        waitForStateTransitionResult: jest.fn(async () => {})
      }
    }

    const key = PrivateKeyWASM.fromHex('3ca33236ab14f6df6cf87fcbb0551544fee7dcf4f251557af02c175725764a5a', 'testnet')

    deriveCoreAddressKeyMock.mockResolvedValue(key)
    deriveIdentityRegistrationKey.mockResolvedValue(key)
    deriveIdentityPrivateKey.mockResolvedValue(key)
    buildAssetLockFromFundingTxMock.mockResolvedValue({
      assetLockTx: { hash: () => assetLockTxid, bytes: () => Uint8Array.from([1]) },
      lockedAmount: 100000000n
    } as any)
    buildIdentityCreateTransition.mockReturnValue({
      getOwnerId: () => ({ base58: () => identifier }),
      hash: () => 'stateTransitionHash',
      signByPrivateKey: jest.fn()
    })
    waitForAssetLockProofMock.mockResolvedValue({ type: 'instantLock', transaction: 't', instantLock: 'l', outputIndex: 0 } as any)

    handler = new RegisterIdentityHandler(
      walletRepository,
      identitiesRepository,
      assetLockFundingAddressesRepository,
      {} as any,
      sdk,
      coreSDK
    )
  })

  const handle = async (payload: any = {}): Promise<any> => await handler.handle({
    context: 'dash-platform-extension',
    id: 'id',
    method: 'REGISTER_IDENTITY',
    type: 'request',
    payload: { password, assetLockFundingAddress: ownAddress, assetLockFundingTxid: fundingTxid, ...payload }
  } as any)

  it('signs the asset lock with the key of the wallet own address', async () => {
    const result = await handle()

    expect(result.identifier).toBe(identifier)
    expect(deriveCoreAddressKeyMock).toHaveBeenCalledWith(expect.anything(), password, 'xpub', ownAddress, sdk)
    // The transaction is built exactly as for a deposit: same builder, same
    // arguments, only the key is derived rather than decrypted.
    expect(buildAssetLockFromFundingTxMock).toHaveBeenCalledWith(
      coreSDK, fundingTxid, ownAddress, expect.any(String), creditAddress
    )
  })

  it('opens the record and pins the identity index before broadcasting', async () => {
    await handle()

    // Keyed by the credit output address, so the paying address stays reusable.
    expect(assetLockFundingAddressesRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      address: creditAddress,
      encryptedPrivateKey: null,
      registrationIdentityIndex: 0,
      purpose: 'registration'
    }))
    expect(assetLockFundingAddressesRepository.create.mock.invocationCallOrder[0])
      .toBeLessThan(coreSDK.broadcastTransaction.mock.invocationCallOrder[0])
    expect(assetLockFundingAddressesRepository.markAsBroadcasted)
      .toHaveBeenCalledWith(creditAddress, assetLockTxid, 0)
  })

  it('rebuilds the same asset lock on a retry and does not send it twice', async () => {
    await handle()
    stored[0].used = false
    coreSDK.broadcastTransaction.mockClear()
    deriveIdentityRegistrationKey.mockClear()

    const result = await handle()

    expect(result.identifier).toBe(identifier)
    // The pinned index is reused, so the rebuilt transaction is the same one, and
    // the asset lock already on L1 is not broadcast again.
    for (const call of deriveIdentityRegistrationKey.mock.calls) {
      expect(call[2]).toBe(0)
    }
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  it('refuses an address the wallet does not own', async () => {
    deriveCoreAddressKeyMock.mockRejectedValue(new Error("Core address yfoo is not one of this wallet's own addresses"))

    await expect(handle({ assetLockFundingAddress: 'yfoo' })).rejects.toThrow(/not one of this wallet/)
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })
})

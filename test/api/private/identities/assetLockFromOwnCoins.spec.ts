import { PrivateKeyWASM } from 'dash-platform-sdk/types'
import { RegisterIdentityHandler } from '../../../../src/content-script/api/private/identities/registerIdentity'
import { TopUpIdentityHandler } from '../../../../src/content-script/api/private/identities/topUpIdentity'
import { buildAssetLockFromFundingTx } from '../../../../src/utils/buildAssetLockFromFundingTx'
import { waitForAssetLockProof } from '../../../../src/utils/waitForAssetLockProof'
import { deriveCoreAddressPrivateKey } from '../../../../src/utils/coreAddresses'
import { WalletType } from '../../../../src/types'
import { IdentityType } from '../../../../src/types/enums/IdentityType'

jest.mock('../../../../src/utils/buildAssetLockFromFundingTx', () => ({
  buildAssetLockFromFundingTx: jest.fn()
}))

jest.mock('../../../../src/utils/waitForAssetLockProof', () => ({
  waitForAssetLockProof: jest.fn()
}))

jest.mock('../../../../src/utils/coreAddresses', () => ({
  ...jest.requireActual('../../../../src/utils/coreAddresses'),
  deriveCoreAccountXpub: jest.fn(async () => 'tpub'),
  deriveCoreAddressPrivateKey: jest.fn()
}))

jest.mock('../../../../src/utils/identityRegistration', () => ({
  IDENTITY_KEY_DEFINITIONS: [{ id: 0 }],
  buildIdentityCreateTransition: jest.fn()
}))

jest.mock('../../../../src/utils', () => ({
  ...jest.requireActual('../../../../src/utils'),
  deriveIdentityPrivateKey: jest.fn(),
  deriveIdentityRegistrationKey: jest.fn(),
  deriveWalletHdKey: jest.fn(() => ({})),
  deriveTopUpKeyFromHdKey: jest.fn()
}))

const buildAssetLockFromFundingTxMock = buildAssetLockFromFundingTx as jest.MockedFunction<typeof buildAssetLockFromFundingTx>
const waitForAssetLockProofMock = waitForAssetLockProof as jest.MockedFunction<typeof waitForAssetLockProof>
const deriveCoreAddressPrivateKeyMock = deriveCoreAddressPrivateKey as jest.MockedFunction<typeof deriveCoreAddressPrivateKey>
const { buildIdentityCreateTransition } = jest.requireMock('../../../../src/utils/identityRegistration')
const { deriveIdentityRegistrationKey, deriveIdentityPrivateKey, deriveTopUpKeyFromHdKey } = jest.requireMock('../../../../src/utils')

// Funding an asset lock with the wallet's own Core output: the caller names the
// address and the transaction that paid it, exactly as for a deposit. There is
// no record to read, so the key comes from the seed and L1 is asked what an
// earlier attempt committed.
describe('an asset lock funded from the wallet own coins', () => {
  const identifier = 'HT3pUBM1Uv2mKgdPEN1gxa7A4PdsvNY89aJbdSKQb5wR'
  const ownAddress = 'yTtgx2GriUKCECox9NWe9eutk7hFU5Hb8j'
  const creditAddress = 'yjLG5HeifV72L78cr6EW4sEC9AATZnmLXA'
  const fundingTxid = 'a'.repeat(64)
  const assetLockTxid = 'b'.repeat(64)
  const password = 'test'

  const key = PrivateKeyWASM.fromHex('3ca33236ab14f6df6cf87fcbb0551544fee7dcf4f251557af02c175725764a5a', 'testnet')

  let walletRepository: any
  let identitiesRepository: any
  let assetLockFundingAddressesRepository: any
  let pendingAssetLocksRepository: any
  let coreExplorer: any
  let coreSDK: any
  let sdk: any
  let stateTransition: any

  beforeEach(() => {
    jest.clearAllMocks()

    walletRepository = {
      getCurrent: jest.fn(async () => ({
        walletId: 'wallet1',
        network: 'testnet',
        type: WalletType.seedphrase,
        encryptedMnemonic: 'encryptedMnemonic',
        seedHash: null,
        label: null,
        currentIdentity: identifier
      })),
      getCoreAccountXpub: jest.fn(async () => 'tpub'),
      switchIdentity: jest.fn(async () => {})
    }

    identitiesRepository = {
      getByIdentifier: jest.fn(async () => ({ identifier, index: 0, label: null, proTxHash: null, type: IdentityType.regular })),
      create: jest.fn(async () => ({ identifier })),
      remove: jest.fn(async () => {}),
      getAll: jest.fn(async () => [])
    }

    pendingAssetLocksRepository = {
      create: jest.fn(async () => {}),
      remove: jest.fn(async () => {}),
      getAll: jest.fn(async () => []),
      forScope: jest.fn(() => pendingAssetLocksRepository)
    }

    assetLockFundingAddressesRepository = {
      getByAddress: jest.fn(async () => null),
      create: jest.fn(async () => {}),
      markAsBroadcasted: jest.fn(async () => {}),
      markAsUsed: jest.fn(async () => {})
    }

    coreExplorer = {
      getXpubSummary: jest.fn(async () => ({ nextUnused: { receiving: 3, change: 0 } })),
      getOutputSpender: jest.fn(async () => null),
      isAddressUsed: jest.fn(async () => false)
    }

    coreSDK = {
      broadcastTransaction: jest.fn(async () => {}),
      getTransaction: jest.fn(async () => null),
      subscribeToTransactions: jest.fn(() => ({ close: jest.fn() }))
    }

    stateTransition = {
      getOwnerId: () => ({ base58: () => identifier }),
      hash: () => 'stateTransitionHash',
      signByPrivateKey: jest.fn()
    }

    coreSDK.network = 'testnet'

    sdk = {
      getNetwork: () => 'testnet',
      keyPair: { p2pkhAddress: jest.fn(() => creditAddress) },
      identities: {
        getIdentityByPublicKeyHash: jest.fn(async () => null),
        getIdentityByNonUniquePublicKeyHash: jest.fn(async () => null),
        createStateTransition: jest.fn(() => stateTransition)
      },
      stateTransitions: {
        broadcast: jest.fn(async () => {}),
        waitForStateTransitionResult: jest.fn(async () => {})
      }
    }

    deriveCoreAddressPrivateKeyMock.mockResolvedValue(key)
    deriveIdentityRegistrationKey.mockResolvedValue(key)
    deriveIdentityPrivateKey.mockResolvedValue(key)
    deriveTopUpKeyFromHdKey.mockResolvedValue(key)
    buildIdentityCreateTransition.mockReturnValue(stateTransition)
    buildAssetLockFromFundingTxMock.mockResolvedValue({
      assetLockTx: { hash: () => assetLockTxid, bytes: () => Uint8Array.from([1]) },
      lockedAmount: 100000000n
    } as any)
    waitForAssetLockProofMock.mockResolvedValue({ type: 'instantLock' } as any)
  })

  const register = async (): Promise<any> => await new RegisterIdentityHandler(
    walletRepository, identitiesRepository, assetLockFundingAddressesRepository, pendingAssetLocksRepository, {} as any, sdk, coreSDK, coreExplorer
  ).handle({
    context: 'dash-platform-extension',
    id: 'id',
    method: 'REGISTER_IDENTITY',
    type: 'request',
    payload: { password, assetLockFundingAddress: ownAddress, assetLockFundingTxid: fundingTxid }
  } as any)

  const topUp = async (): Promise<any> => await new TopUpIdentityHandler(
    { ...walletRepository, forScope: () => walletRepository },
    { ...identitiesRepository, forScope: () => identitiesRepository },
    { ...assetLockFundingAddressesRepository, forScope: () => assetLockFundingAddressesRepository },
    pendingAssetLocksRepository,
    sdk, coreSDK, coreExplorer
  ).handle({
    context: 'dash-platform-extension',
    id: 'id',
    method: 'TOP_UP_IDENTITY',
    type: 'request',
    payload: { identityId: identifier, password, assetLockFundingAddress: ownAddress, assetLockFundingTxid: fundingTxid }
  } as any)

  describe('registration', () => {
    it('signs the asset lock with the key of the wallet own address and claims no funding address', async () => {
      const result = await register()

      expect(result.identifier).toBe(identifier)
      expect(deriveCoreAddressPrivateKeyMock).toHaveBeenCalledWith(
        expect.anything(), password, 'tpub', ownAddress, { receiving: 3, change: 0 }, sdk
      )
      // Same builder and same arguments as a deposit: only the key differs.
      expect(buildAssetLockFromFundingTxMock).toHaveBeenCalledWith(
        coreSDK, fundingTxid, ownAddress, key.WIF(), creditAddress
      )
      expect(coreSDK.broadcastTransaction).toHaveBeenCalled()
      expect(assetLockFundingAddressesRepository.create).not.toHaveBeenCalled()
      expect(assetLockFundingAddressesRepository.markAsBroadcasted).not.toHaveBeenCalled()
      expect(assetLockFundingAddressesRepository.markAsUsed).not.toHaveBeenCalled()
    })

    it('rebuilds the asset lock L1 already holds and does not broadcast it twice', async () => {
      coreExplorer.getOutputSpender.mockResolvedValue(assetLockTxid)

      const result = await register()

      expect(result.identifier).toBe(identifier)
      expect(coreExplorer.getOutputSpender).toHaveBeenCalledWith(fundingTxid, ownAddress, 'testnet')
      expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
    })

    it('records the asset lock before broadcasting it and forgets it on success', async () => {
      await register()

      expect(pendingAssetLocksRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        assetLockTxid, purpose: 'registration', identityId: null, amountDuffs: '100000000'
      }))
      expect(pendingAssetLocksRepository.create.mock.invocationCallOrder[0])
        .toBeLessThan(coreSDK.broadcastTransaction.mock.invocationCallOrder[0])
      expect(pendingAssetLocksRepository.remove).toHaveBeenCalledWith(assetLockTxid)
    })

    it('refuses an address the wallet does not own', async () => {
      deriveCoreAddressPrivateKeyMock.mockRejectedValue(new Error("Core address yfoo is not one of this wallet's own addresses"))

      await expect(register()).rejects.toThrow(/not one of this wallet/)
      expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
    })
  })

  describe('top-up', () => {
    it('spends the own output and sends the credits to a DIP-13 top-up key', async () => {
      const result = await topUp()

      expect(result.stateTransitionHash).toBe('stateTransitionHash')
      expect(deriveTopUpKeyFromHdKey).toHaveBeenCalledWith(expect.anything(), 'testnet', 0, sdk)
      expect(buildAssetLockFromFundingTxMock).toHaveBeenCalledWith(
        coreSDK, fundingTxid, ownAddress, key.WIF(), creditAddress
      )
      // The credit key, not the paying address key, signs the state transition.
      expect(stateTransition.signByPrivateKey).toHaveBeenCalledWith(key, undefined, expect.anything())
      expect(assetLockFundingAddressesRepository.markAsUsed).not.toHaveBeenCalled()
    })

    it('records the asset lock against the identity it tops up', async () => {
      await topUp()

      expect(pendingAssetLocksRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        assetLockTxid, purpose: 'topUp', identityId: identifier
      }))
      expect(pendingAssetLocksRepository.remove).toHaveBeenCalledWith(assetLockTxid)
    })

    it('takes the next top-up index that has never appeared on L1', async () => {
      coreExplorer.isAddressUsed.mockResolvedValueOnce(true)

      await topUp()

      expect(deriveTopUpKeyFromHdKey).toHaveBeenNthCalledWith(1, expect.anything(), 'testnet', 0, sdk)
      expect(deriveTopUpKeyFromHdKey).toHaveBeenNthCalledWith(2, expect.anything(), 'testnet', 1, sdk)
    })

    it('recovers the credit key of an asset lock L1 already holds', async () => {
      coreExplorer.getOutputSpender.mockResolvedValue(assetLockTxid)

      await topUp()

      expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
      expect(coreExplorer.isAddressUsed).not.toHaveBeenCalled()
    })
  })
})

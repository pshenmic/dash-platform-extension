import { DashPlatformSDK } from 'dash-platform-sdk'
import { IdentityPublicKeyWASM, PrivateKeyWASM, StateTransitionWASM } from 'pshenmic-dpp'
import { MemoryStorageAdapter } from '../../../../src/content-script/storage/memoryStorageAdapter'
import { StateTransitionsRepository } from '../../../../src/content-script/repository/StateTransitionsRepository'
import { ApproveStateTransitionHandler } from '../../../../src/content-script/api/private/stateTransitions/approveStateTransition'
import { WalletType } from '../../../../src/types/WalletType'
import { deriveIdentityPrivateKey } from '../../../../src/utils'
import { bytesToHex } from '../../../../src/utils/browser'

jest.mock('../../../../src/utils', () => ({
  ...jest.requireActual('../../../../src/utils'),
  deriveIdentityPrivateKey: jest.fn()
}))

const deriveIdentityPrivateKeyMock = deriveIdentityPrivateKey as jest.MockedFunction<typeof deriveIdentityPrivateKey>

const IDENTITY_ID = 'HT3pUBM1Uv2mKgdPEN1gxa7A4PdsvNY89aJbdSKQb5wR'
const KEY_ID = 1

// The key the wallet derives. A refusal has to happen before signing, so the
// identity's own public key is a stand-in carrying only what is checked.
const walletKey = PrivateKeyWASM.fromBytes(new Uint8Array(32).fill(7), 'testnet')
const otherKey = PrivateKeyWASM.fromBytes(new Uint8Array(32).fill(9), 'testnet')

const publicKey = (over: { disabledAt?: string | null, hash?: string } = {}): any => ({
  keyId: KEY_ID,
  disabledAt: over.disabledAt ?? null,
  getPublicKeyHash: () => over.hash ?? walletKey.getPublicKey().getPublicKeyHash()
})

describe('ApproveStateTransitionHandler.sign', () => {
  const wallet = { type: WalletType.seedphrase } as any
  const identity = { identifier: IDENTITY_ID, index: 0 } as any

  let sdk: DashPlatformSDK
  let stateTransitionBase64: string
  let handler: ApproveStateTransitionHandler

  beforeAll(() => {
    sdk = new DashPlatformSDK({ network: 'testnet' })
    // Owner is the identity itself, so sign() takes the straight path and does
    // not go to the network for a nonce.
    stateTransitionBase64 = sdk.identities.createStateTransition('creditTransfer', {
      identityId: IDENTITY_ID,
      recipientId: IDENTITY_ID,
      amount: 1000n,
      identityNonce: 1n
    }).base64()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    deriveIdentityPrivateKeyMock.mockResolvedValue(walletKey)

    const identities = { getIdentityByIdentifier: jest.fn(async () => ({ getPublicKeys: () => [publicKey()] })) }

    handler = new ApproveStateTransitionHandler({} as any, {} as any, {} as any, {} as any, {} as any, { identities } as any)
  })

  const signWith = async (key: any): Promise<any> => {
    const identities = { getIdentityByIdentifier: jest.fn(async () => ({ getPublicKeys: () => [key] })) }

    handler = new ApproveStateTransitionHandler({} as any, {} as any, {} as any, {} as any, {} as any, { identities } as any)

    return await handler.sign(stateTransitionBase64, wallet, identity, KEY_ID, 'password')
  }

  it('refuses a key the identity disabled', async () => {
    await expect(signWith(publicKey({ disabledAt: '1759000000000' })))
      .rejects.toThrow(`Identity Public Key with Key ID ${KEY_ID} is disabled`)
  })

  // Signing with a key that is not the one this wallet derives produces a
  // signature Platform refuses, and the nonce is spent either way.
  it('refuses a key this wallet does not derive', async () => {
    await expect(signWith(publicKey({ hash: otherKey.getPublicKey().getPublicKeyHash() })))
      .rejects.toThrow(`Identity Public Key with Key ID ${KEY_ID} does not match`)
  })

  it('still refuses a key id the identity does not hold', async () => {
    await expect(signWith({ ...publicKey(), keyId: KEY_ID + 5 }))
      .rejects.toThrow(`Could not find Identity Public Key with Key ID ${KEY_ID}`)
  })
})

// Approving names the identity to sign as, and the handler replaces the owner
// and the nonce when it is not the transition's own. That rewrite changes
// `hash(true)`, so the record the page is waiting on can only be found by the
// hash it was created under.
describe('ApproveStateTransitionHandler.handle', () => {
  const OTHER_IDENTITY_ID = 'Aa1ZUSjKsQDNJTV53NYs7PtaxKjCxdegZrqeywFy5y4M'

  let storage: MemoryStorageAdapter
  let stateTransitionsRepository: StateTransitionsRepository
  let broadcast: jest.Mock
  let handler: ApproveStateTransitionHandler
  let queuedHash: string

  beforeEach(async () => {
    jest.clearAllMocks()
    deriveIdentityPrivateKeyMock.mockResolvedValue(walletKey)

    storage = new MemoryStorageAdapter()
    await storage.set('network', 'testnet')
    await storage.set('currentWalletId', 'wallet1')
    await storage.set('stateTransitions_testnet_wallet1', {})

    stateTransitionsRepository = new StateTransitionsRepository(storage)

    const sdk = new DashPlatformSDK({ network: 'testnet' })
    const queued = sdk.identities.createStateTransition('creditTransfer', {
      identityId: IDENTITY_ID,
      recipientId: OTHER_IDENTITY_ID,
      amount: 1000n,
      identityNonce: 1n
    })

    queuedHash = queued.hash(true)

    await stateTransitionsRepository.createFromEncoded(queued.base64(), queuedHash, 'https://app.example.com')

    broadcast = jest.fn()

    const identityPublicKey = new IdentityPublicKeyWASM(
      KEY_ID, 'TRANSFER', 'CRITICAL', 'ECDSA_SECP256K1', false,
      bytesToHex(walletKey.getPublicKey().bytes())
    )

    const sdkMock = {
      identities: {
        getIdentityByIdentifier: jest.fn(async () => ({ getPublicKeys: () => [identityPublicKey] })),
        getIdentityNonce: jest.fn(async () => 7n)
      },
      stateTransitions: {
        broadcast,
        waitForStateTransitionResult: jest.fn()
      }
    }

    handler = new ApproveStateTransitionHandler(
      stateTransitionsRepository,
      { getByIdentifier: jest.fn(async () => ({ identifier: OTHER_IDENTITY_ID, index: 0 })) } as any,
      { getCurrent: jest.fn(async () => ({ type: WalletType.seedphrase })) } as any,
      {} as any,
      storage,
      sdkMock as any
    )
  })

  it('resolves the record the page is waiting on', async () => {
    await handler.handle({ payload: { hash: queuedHash, identity: OTHER_IDENTITY_ID, keyId: KEY_ID, password: 'password' } } as any)

    const stateTransition = await stateTransitionsRepository.getByHash(queuedHash)

    expect(broadcast).toHaveBeenCalledTimes(1)
    expect(stateTransition?.status).toBe('approved')
    expect(stateTransition?.signedHash).not.toBeNull()
  })

  it('stores the transition that was signed, not the one the page supplied', async () => {
    await handler.handle({ payload: { hash: queuedHash, identity: OTHER_IDENTITY_ID, keyId: KEY_ID, password: 'password' } } as any)

    const stateTransition = await stateTransitionsRepository.getByHash(queuedHash)
    const signed = StateTransitionWASM.fromBase64(stateTransition?.signed as string)

    // What the page holds still names the old owner, so a page that applied
    // the signature to its own copy would report a transition nobody sent.
    expect(signed.getOwnerId()?.base58()).toBe(OTHER_IDENTITY_ID)
    expect(signed.hash(true)).not.toBe(queuedHash)
    expect(signed.hash(false)).toBe(stateTransition?.signedHash)
    expect(stateTransition?.signed).not.toBe(stateTransition?.unsigned)
  })
})

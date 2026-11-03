import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'pshenmic-dpp'
import { ApproveStateTransitionHandler } from '../../../../src/content-script/api/private/stateTransitions/approveStateTransition'
import { WalletType } from '../../../../src/types/WalletType'
import { deriveIdentityPrivateKey } from '../../../../src/utils'

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

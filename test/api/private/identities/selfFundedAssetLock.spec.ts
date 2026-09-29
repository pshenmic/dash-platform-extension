import { PrivateKeyWASM } from 'dash-platform-sdk/types'
import { Transaction } from 'dash-core-sdk'
import { RegisterIdentityHandler } from '../../../../src/content-script/api/private/identities/registerIdentity'
import { waitForAssetLockProof } from '../../../../src/utils/waitForAssetLockProof'
import { WalletType } from '../../../../src/types'

jest.mock('../../../../src/utils/waitForAssetLockProof', () => ({
  waitForAssetLockProof: jest.fn()
}))

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

const waitForAssetLockProofMock = waitForAssetLockProof as jest.MockedFunction<typeof waitForAssetLockProof>
const { buildIdentityCreateTransition } = jest.requireMock('../../../../src/utils/identityRegistration')
const { deriveIdentityRegistrationKey, deriveIdentityPrivateKey } = jest.requireMock('../../../../src/utils')

// An asset lock funded from the wallet's own Core coins: no deposit, no one-off
// key. The pipeline is the one the deposit flow uses; only the transaction's
// inputs and the bookkeeping around them differ, so that is what this covers.
describe('RegisterIdentityHandler funded from the wallet own coins', () => {
  const identifier = 'HT3pUBM1Uv2mKgdPEN1gxa7A4PdsvNY89aJbdSKQb5wR'
  // Real testnet addresses: the fee estimate builds an actual transaction.
  const creditOutputAddress = 'yjLG5HeifV72L78cr6EW4sEC9AATZnmLXA'
  const password = 'test'
  const assetLockTxid = 'b'.repeat(64)

  let stored: any[]
  let walletRepository: any
  let identitiesRepository: any
  let assetLockFundingAddressesRepository: any
  let coreSDK: any
  let coreAssetLock: any
  let sdk: any
  let signedTx: any
  let handler: RegisterIdentityHandler

  beforeEach(() => {
    jest.clearAllMocks()
    stored = []

    signedTx = {
      hash: () => assetLockTxid,
      hex: () => 'signedassetlockhex',
      bytes: () => Uint8Array.from([1, 2, 3])
    }

    // The stored bytes are this stub, so parsing them back is stubbed as well;
    // what matters here is that the stored transaction is the one that gets sent.
    jest.spyOn(Transaction, 'fromHex').mockReturnValue(signedTx)

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
      getCoreAccountXpub: jest.fn(async () => 'xpub'),
      setCoreAccountXpub: jest.fn(async () => {})
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
      getAll: jest.fn(async () => stored),
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

    coreAssetLock = {
      accountXpub: jest.fn(async () => 'xpub'),
      spendableUtxos: jest.fn(async () => [
        { address: 'yTtgx2GriUKCECox9NWe9eutk7hFU5Hb8j', derivationPath: "m/44'/1'/0'/0/0", index: 0, chain: 0, txid: 'a'.repeat(64), vout: 0, amount: '200000000' }
      ]),
      changeAddress: jest.fn(async () => 'yRmRnGBF5mjjNPqijsFXqrdV9XpkbdnwcQ'),
      reservedOutpoints: jest.fn(() => new Set<string>()),
      signPlan: jest.fn(async () => signedTx)
    }

    sdk = {
      keyPair: {
        p2pkhAddress: jest.fn(() => creditOutputAddress)
      },
      identities: {
        getIdentityByPublicKeyHash: jest.fn(async () => null),
        getIdentityByNonUniquePublicKeyHash: jest.fn(async () => null)
      },
      stateTransitions: {
        broadcast: jest.fn(async () => {}),
        waitForStateTransitionResult: jest.fn(async () => {})
      }
    }

    deriveIdentityRegistrationKey.mockResolvedValue(PrivateKeyWASM.fromHex('3ca33236ab14f6df6cf87fcbb0551544fee7dcf4f251557af02c175725764a5a', 'testnet'))
    deriveIdentityPrivateKey.mockResolvedValue(PrivateKeyWASM.fromHex('3ca33236ab14f6df6cf87fcbb0551544fee7dcf4f251557af02c175725764a5a', 'testnet'))
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
      coreSDK,
      coreAssetLock
    )
  })

  const handle = async (payload: any = {}): Promise<any> => await handler.handle({
    context: 'dash-platform-extension',
    id: 'id',
    method: 'REGISTER_IDENTITY',
    type: 'request',
    payload: { password, amountCredits: '100000000000', ...payload }
  } as any)

  it('spends the wallet own coins and stores the signed asset lock before broadcasting', async () => {
    const result = await handle()

    expect(result.identifier).toBe(identifier)
    expect(coreAssetLock.signPlan).toHaveBeenCalledTimes(1)
    // The record is opened against the credit output address, with no one-off key.
    expect(assetLockFundingAddressesRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      address: creditOutputAddress,
      encryptedPrivateKey: null,
      assetLockTx: 'signedassetlockhex',
      registrationIdentityIndex: 0,
      purpose: 'registration'
    }))
    // Stored first, broadcast second: a crash in between must leave the exact
    // transaction to send, not a selection to redo.
    expect(assetLockFundingAddressesRepository.create.mock.invocationCallOrder[0])
      .toBeLessThan(coreSDK.broadcastTransaction.mock.invocationCallOrder[0])
    expect(coreSDK.broadcastTransaction).toHaveBeenCalledTimes(1)
  })

  it('resends the stored transaction on a retry instead of selecting coins again', async () => {
    await handle()
    coreAssetLock.signPlan.mockClear()
    coreAssetLock.spendableUtxos.mockClear()
    coreSDK.broadcastTransaction.mockClear()
    stored[0].used = false

    const result = await handle()

    expect(result.identifier).toBe(identifier)
    // Nothing is selected or signed again, and the asset lock is not sent twice.
    expect(coreAssetLock.spendableUtxos).not.toHaveBeenCalled()
    expect(coreAssetLock.signPlan).not.toHaveBeenCalled()
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  it('keeps the identity index pinned to the asset lock across a retry', async () => {
    await handle()
    stored[0].used = false
    deriveIdentityRegistrationKey.mockClear()

    await handle()

    // Every derivation is at the pinned index, so the credit output address - and
    // with it the txid - cannot drift.
    for (const call of deriveIdentityRegistrationKey.mock.calls) {
      expect(call[2]).toBe(0)
    }
  })

  it('asks for an amount, and for one that is a whole number of duffs', async () => {
    await expect(handle({ amountCredits: undefined })).rejects.toThrow(/amount in credits/)
    await expect(handle({ amountCredits: '1500' })).rejects.toThrow(/whole number of duffs/)
    expect(coreAssetLock.signPlan).not.toHaveBeenCalled()
  })

  it('leaves the deposit path alone when an address is given', async () => {
    stored.push({ address: 'yZPSYxHnNEc6TyZJx6AUrHkAZJcFgp5H9j', encryptedPrivateKey: 'deadbeef', used: false, assetLockTxid: null })

    await expect(handle({ assetLockFundingAddress: 'yZPSYxHnNEc6TyZJx6AUrHkAZJcFgp5H9j', assetLockFundingTxid: 'a'.repeat(64) }))
      .rejects.toThrow(/Failed to decrypt asset lock funding key/)
    expect(coreAssetLock.signPlan).not.toHaveBeenCalled()
  })
})

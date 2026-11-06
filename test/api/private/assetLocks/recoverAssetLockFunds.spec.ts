import { PrivateKey, encrypt } from 'eciesjs'
import hash from 'hash.js'
import { RecoverAssetLockFundsHandler } from '../../../../src/content-script/api/private/assetLocks/recoverAssetLockFunds'
import { MessagingMethods } from '../../../../src/types/enums/MessagingMethods'
import type { EventData } from '../../../../src/types/EventData'
import type { AssetLockFundingAddressSchema } from '../../../../src/content-script/storage/storageSchema'

const PASSWORD = 'correct horse battery staple'
const WRONG_PASSWORD = 'not the password'

// A real testnet keypair: PrivateKeyWASM.fromBytes(fill(7), 'testnet') derives
// exactly this WIF and public key, so decryption, address derivation and signing
// all run for real.
const FUNDING_KEY_BYTES = new Uint8Array(32).fill(7)
const FUNDING_PUBKEY = '02989c0b76cb563971fdc9bef31ec06c3560f3249d6ee9e5d83c57625596e05f6f'
const FUNDING_ADDRESS = 'ybFR23ZZjWb5UFke4RtDPoEVgCtNukW5zu'
const RECIPIENT = 'yLQmwB9hninHD8Ceh2UAqLFWCzirppNLik'

const OTHER_KEY_BYTES = new Uint8Array(32).fill(9)

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('')

// The same envelope the extension writes: ECIES to the public half of
// sha256(password), which is what decryptAssetLockFundingKey unwraps.
const sealKey = (keyBytes: Uint8Array, password: string = PASSWORD): string => {
  const passwordPublicKey = PrivateKey.fromHex(hash.sha256().update(password).digest('hex')).publicKey.toHex()

  return toHex(encrypt(passwordPublicKey, keyBytes))
}

const entry = (overrides: Partial<AssetLockFundingAddressSchema> = {}): AssetLockFundingAddressSchema => ({
  address: FUNDING_ADDRESS,
  encryptedPrivateKey: sealKey(FUNDING_KEY_BYTES),
  used: false,
  ...overrides
})

const utxo = (amount: bigint, vout = 0): any => ({
  txid: `${vout}`.padStart(64, '0'),
  vout,
  amount
})

interface RecoverHarness {
  handler: RecoverAssetLockFundsHandler
  repository: { forScope: () => any, getByAddress: jest.Mock, markAsUsed: jest.Mock }
  coreExplorer: { getAddressUtxos: jest.Mock }
  coreSDK: { broadcastTransaction: jest.Mock }
  sdk: { keyPair: { p2pkhAddress: jest.Mock } }
}

const buildHarness = (
  stored: AssetLockFundingAddressSchema | null,
  utxos: any[] = [utxo(100_000n)]
): RecoverHarness => {
  const repository: any = {
    forScope: () => repository,
    getByAddress: jest.fn(async (address: string) => address === stored?.address ? stored : null),
    markAsUsed: jest.fn(async () => {})
  }

  const walletRepository = {
    getCurrent: jest.fn(async () => ({ walletId: 'wallet1', network: 'testnet' }))
  } as any

  const coreExplorer = { getAddressUtxos: jest.fn(async () => utxos) } as any
  const coreSDK = { broadcastTransaction: jest.fn(async () => {}) } as any

  // Stands in for the SDK's address encoding. Answers the funding address only for
  // the public key that really belongs to it, so a key stored against the wrong
  // address is caught the way production catches it.
  const sdk = {
    keyPair: {
      p2pkhAddress: jest.fn((publicKeyBytes: Uint8Array) =>
        toHex(publicKeyBytes) === FUNDING_PUBKEY ? FUNDING_ADDRESS : 'yMISMATCHMISMATCHMISMATCHMISMATCHMISMATCH1')
    }
  } as any

  const handler = new RecoverAssetLockFundsHandler(
    walletRepository, repository, coreExplorer, coreSDK, sdk
  )

  return { handler, repository, coreExplorer, coreSDK, sdk }
}

const event = (payload: Record<string, any>): EventData => ({
  context: 'dash-platform-extension',
  id: 'request-id',
  type: 'request',
  method: MessagingMethods.RECOVER_ASSET_LOCK_FUNDS,
  payload: { fundingAddress: FUNDING_ADDRESS, toAddress: RECIPIENT, password: PASSWORD, ...payload }
})

describe('RecoverAssetLockFundsHandler', () => {
  it('broadcasts a sweep and closes the entry out', async () => {
    const { handler, repository, coreSDK } = buildHarness(entry())

    const result = await handler.handle(event({}))

    expect(coreSDK.broadcastTransaction).toHaveBeenCalledTimes(1)
    expect(repository.markAsUsed).toHaveBeenCalledWith(FUNDING_ADDRESS)
    expect(result.fromAddress).toBe(FUNDING_ADDRESS)
    expect(result.toAddress).toBe(RECIPIENT)
    expect(result.txid).toMatch(/^[0-9a-f]{64}$/)
    // 100_000 in, less the fee for one input and one output.
    expect(BigInt(result.amountDuffs) + BigInt(result.feeDuffs)).toBe(100_000n)
  })

  it('spends every output at the address, not just one', async () => {
    const { handler, coreSDK } = buildHarness(entry(), [utxo(60_000n), utxo(40_000n, 1)])

    const result = await handler.handle(event({}))

    const broadcast = coreSDK.broadcastTransaction.mock.calls[0][0] as Uint8Array
    expect(broadcast.length).toBeGreaterThan(0)
    expect(BigInt(result.amountDuffs) + BigInt(result.feeDuffs)).toBe(100_000n)
  })

  it('refuses an address it was never given', async () => {
    const { handler, coreSDK } = buildHarness(entry())

    await expect(handler.handle(event({ fundingAddress: 'yOTHERADDRESS' })))
      .rejects.toThrow(/is not known/)
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  // A used address is the operation being finished, so its asset lock already
  // took the input it needed. Anything still sitting here arrived afterwards and
  // belongs to nobody else - refusing it left those funds visible but unreachable.
  it('sweeps a finished entry that still holds a stray deposit', async () => {
    const { handler, coreSDK } = buildHarness(entry({ used: true }), [utxo(50_000n)])

    const result = await handler.handle(event({}))

    expect(coreSDK.broadcastTransaction).toHaveBeenCalledTimes(1)
    expect(BigInt(result.amountDuffs) + BigInt(result.feeDuffs)).toBe(50_000n)
  })

  it('sweeps a finished registration whose asset lock is already on L1', async () => {
    const { handler, coreSDK } = buildHarness(
      entry({ used: true, assetLockTxid: 'a'.repeat(64) }),
      [utxo(50_000n)]
    )

    const result = await handler.handle(event({}))

    expect(coreSDK.broadcastTransaction).toHaveBeenCalledTimes(1)
    expect(BigInt(result.amountDuffs)).toBeGreaterThan(0n)
  })

  it('still refuses a finished entry with nothing left on it', async () => {
    const { handler, coreSDK } = buildHarness(entry({ used: true }), [])

    await expect(handler.handle(event({}))).rejects.toThrow(/no unspent outputs/)
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  // The deposit is an asset lock's input and that operation can still finish.
  // Sweeping it would double-spend and strand the registration.
  it('refuses an unfinished entry whose deposit is committed to an asset lock', async () => {
    const { handler, coreSDK } = buildHarness(entry({ assetLockTxid: 'a'.repeat(64) }))

    await expect(handler.handle(event({}))).rejects.toThrow(/whose registration never finished/)
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  it('refuses an entry with no stored key', async () => {
    const { handler, coreSDK } = buildHarness(entry({ encryptedPrivateKey: '' }))

    await expect(handler.handle(event({}))).rejects.toThrow(/no stored key/)
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  it('refuses the wrong password', async () => {
    const { handler, coreSDK } = buildHarness(entry())

    await expect(handler.handle(event({ password: WRONG_PASSWORD })))
      .rejects.toThrow(/Failed to decrypt asset lock funding key/)
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  // A key that decrypts cleanly but belongs to a different address: the shape a
  // corrupted or mis-filed entry takes. dash-core-sdk signs it without complaint,
  // so this check is the only thing standing between the user and a transaction
  // no node will ever relay.
  it('refuses a stored key that does not derive the address', async () => {
    const { handler, coreSDK, sdk } = buildHarness(entry({ encryptedPrivateKey: sealKey(OTHER_KEY_BYTES) }))

    await expect(handler.handle(event({}))).rejects.toThrow(/derives .* instead/)
    expect(sdk.keyPair.p2pkhAddress).toHaveBeenCalled()
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  it('refuses an address with nothing left to spend', async () => {
    const { handler, coreSDK } = buildHarness(entry(), [])

    await expect(handler.handle(event({}))).rejects.toThrow(/no unspent outputs/)
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  it('does not let the user pay the address they are recovering from', () => {
    const { handler } = buildHarness(entry())

    expect(handler.validatePayload({
      fundingAddress: FUNDING_ADDRESS,
      toAddress: FUNDING_ADDRESS,
      password: PASSWORD
    } as any)).toMatch(/must differ/)
  })

  describe('validatePayload', () => {
    const validate = (payload: any): string | null =>
      new RecoverAssetLockFundsHandler({} as any, {} as any, {} as any, {} as any, {} as any)
        .validatePayload(payload)

    const valid = { fundingAddress: FUNDING_ADDRESS, toAddress: RECIPIENT, password: PASSWORD }

    it('accepts a sweep request', () => {
      expect(validate(valid)).toBeNull()
    })

    it('requires the address, destination and password', () => {
      expect(validate({ ...valid, fundingAddress: '' })).toMatch(/fundingAddress/)
      expect(validate({ ...valid, toAddress: '' })).toMatch(/toAddress/)
      expect(validate({ ...valid, password: '' })).toMatch(/password/)
    })

    it('takes the scope pair together or not at all', () => {
      expect(validate({ ...valid, network: 'testnet', walletId: 'wallet1' })).toBeNull()
      expect(validate({ ...valid, network: 'testnet' })).toMatch(/together/)
      expect(validate({ ...valid, network: 'regtest', walletId: 'wallet1' })).toMatch(/testnet or mainnet/)
    })
  })
})

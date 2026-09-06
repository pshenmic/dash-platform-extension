import { PrivateKey } from 'dash-core-sdk'
import { SendCoreTransferHandler } from '../../../../src/content-script/api/private/core/sendCoreTransfer'
import { CoreAddressChain } from '../../../../src/types/enums/CoreAddressChain'
import { deriveCoreAddressesFromXpub, deriveCoreAddressPrivateKey } from '../../../../src/utils/coreAddresses'
import { deriveWalletHdKey } from '../../../../src/utils'

jest.mock('../../../../src/utils/coreAddresses', () => {
  const actual = jest.requireActual('../../../../src/utils/coreAddresses')
  return {
    ...actual,
    deriveCoreAddressesFromXpub: jest.fn(),
    deriveCoreAddressPrivateKey: jest.fn()
  }
})

jest.mock('../../../../src/utils', () => {
  const actual = jest.requireActual('../../../../src/utils')
  return {
    ...actual,
    deriveWalletHdKey: jest.fn()
  }
})

const deriveCoreAddressesFromXpubMock = deriveCoreAddressesFromXpub as jest.MockedFunction<typeof deriveCoreAddressesFromXpub>
const deriveCoreAddressPrivateKeyMock = deriveCoreAddressPrivateKey as jest.MockedFunction<typeof deriveCoreAddressPrivateKey>
const deriveWalletHdKeyMock = deriveWalletHdKey as jest.MockedFunction<typeof deriveWalletHdKey>

// Valid testnet addresses, so the real address decoding and signing run.
const RECEIVING = ['yWjF8BxE6xr3hew5FUVNBdZhQLcLQq7Tej', 'yWjGKfvcPT5nPTkqFX7H2EQ764Hp5PrCff']
const CHANGE = ['yVMvvEvrZVRvBcyvG4w8VLbbko3EuPcQLA', 'yVMx7iuEqyfesRogG7Z3KwS1SWiibPVUfh']
const DESTINATION = 'yVUKAMNURsDaGB4GFZgJUmYBoBJTW32stY'

// One input, recipient plus change: 226 bytes at 1 duff/byte.
const FEE_1_IN = 226n

const utxo = (address: string, amount: bigint, vout = 0): any => ({
  txid: 'a'.repeat(64),
  vout,
  amount,
  address
})

describe('SendCoreTransferHandler', () => {
  const password = 'test'

  let walletRepository: any
  let coreExplorer: any
  let sdk: any
  let coreSDK: any
  let handler: SendCoreTransferHandler

  const event = (payload: any): any => ({ payload })

  beforeEach(() => {
    jest.clearAllMocks()

    walletRepository = {
      getCurrent: jest.fn(async () => ({
        walletId: 'wallet1',
        type: 'seedphrase',
        network: 'testnet',
        label: null,
        encryptedMnemonic: 'encryptedMnemonic',
        seedHash: 'seedHash',
        currentIdentity: null
      })),
      getCoreAccountXpub: jest.fn(async () => 'tpubAccountXpub')
    }

    coreExplorer = {
      getXpubSummary: jest.fn(async () => ({ nextUnused: { receiving: 1, change: 1 } })),
      getAddressesUtxos: jest.fn(async () => [utxo(RECEIVING[0], 100_000n)])
    }

    // The wallet owns index 0 and 1 on both chains (the explorer's next unused
    // index is 1, and the list includes the free one).
    deriveCoreAddressesFromXpubMock.mockImplementation((_sdk, _xpub, _network, _account, chain, count, start = 0) => {
      const isReceiving = chain === CoreAddressChain.receiving
      const pool = isReceiving ? RECEIVING : CHANGE

      return Array.from({ length: count }, (_, offset) => ({
        address: pool[start + offset],
        derivationPath: `m/44'/1'/0'/${isReceiving ? 0 : 1}/${start + offset}`,
        index: start + offset,
        chain
      }))
    })

    // A real signing key, but reporting the address it was derived for — the
    // handler cross-checks the two and the fixture addresses are not from this key.
    deriveCoreAddressPrivateKeyMock.mockImplementation(async (_hdKey, _network, _account, chain, index) => {
      const privateKey: any = PrivateKey.fromBytes(new Uint8Array(32).fill(7), 'testnet')
      privateKey.getAddress = (): string => (chain === CoreAddressChain.receiving ? RECEIVING : CHANGE)[index]

      return privateKey
    })
    deriveWalletHdKeyMock.mockReturnValue('walletHdKey' as any)

    sdk = {}
    coreSDK = { broadcastTransaction: jest.fn(async () => ({ transactionId: 'broadcasted' })) }

    handler = new SendCoreTransferHandler(walletRepository, coreExplorer, sdk, coreSDK)
  })

  it('spends the wallet outputs, signs and broadcasts the transaction', async () => {
    const response = await handler.handle(event({ toAddress: DESTINATION, amountDuffs: '10000', password }))

    expect(coreSDK.broadcastTransaction).toHaveBeenCalledTimes(1)
    expect(response).toEqual({
      txid: expect.stringMatching(/^[0-9a-f]{64}$/),
      amountDuffs: '10000',
      feeDuffs: FEE_1_IN.toString(),
      changeDuffs: (100_000n - 10_000n - FEE_1_IN).toString(),
      toAddress: DESTINATION,
      changeAddress: CHANGE[1],
      fromAddresses: [RECEIVING[0]]
    })
  })

  it('queries every owned address when no source is given', async () => {
    await handler.handle(event({ toAddress: DESTINATION, amountDuffs: '10000', password }))

    expect(coreExplorer.getAddressesUtxos).toHaveBeenCalledWith([...RECEIVING, ...CHANGE], 'testnet')
  })

  it('limits the spend to the requested source address', async () => {
    await handler.handle(event({ toAddress: DESTINATION, amountDuffs: '10000', password, fromAddress: RECEIVING[0] }))

    expect(coreExplorer.getAddressesUtxos).toHaveBeenCalledWith([RECEIVING[0]], 'testnet')
  })

  it('signs each input with the key of the address it pays to', async () => {
    coreExplorer.getAddressesUtxos.mockResolvedValue([
      utxo(RECEIVING[1], 6_000n),
      utxo(CHANGE[0], 7_000n, 1)
    ])

    await handler.handle(event({ toAddress: DESTINATION, amountDuffs: '10000', password }))

    expect(deriveCoreAddressPrivateKeyMock.mock.calls.map(call => [call[3], call[4]])).toEqual([
      [CoreAddressChain.change, 0],
      [CoreAddressChain.receiving, 1]
    ])
  })

  it('refuses to sign when the derived key does not match the address it spends', async () => {
    deriveCoreAddressPrivateKeyMock.mockResolvedValue(PrivateKey.fromBytes(new Uint8Array(32).fill(7), 'testnet'))

    await expect(handler.handle(event({ toAddress: DESTINATION, amountDuffs: '10000', password })))
      .rejects.toThrow('the stored xpub and the wallet seed disagree')
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  it('rejects a source address the wallet does not own', async () => {
    await expect(handler.handle(event({ toAddress: DESTINATION, amountDuffs: '10000', password, fromAddress: DESTINATION })))
      .rejects.toThrow('Source address not found in this wallet')
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  it('rejects a recipient from another network before touching the explorer', async () => {
    await expect(handler.handle(event({ toAddress: 'XanAvE5GMB8CsPH78B9moJq9viEVKvCS4f', amountDuffs: '10000', password })))
      .rejects.toThrow('Invalid recipient Core address for testnet')
    expect(coreExplorer.getXpubSummary).not.toHaveBeenCalled()
  })

  it('throws when the wallet has no unspent outputs', async () => {
    coreExplorer.getAddressesUtxos.mockResolvedValue([])

    await expect(handler.handle(event({ toAddress: DESTINATION, amountDuffs: '10000', password })))
      .rejects.toThrow('This wallet has no unspent Core outputs to spend')
  })

  it('throws when the Core xpub has never been initialized', async () => {
    walletRepository.getCoreAccountXpub.mockResolvedValue(null)

    await expect(handler.handle(event({ toAddress: DESTINATION, amountDuffs: '10000', password })))
      .rejects.toThrow('Core xpub is not initialized')
  })

  it('refuses a wallet that has no seed phrase to derive keys from', async () => {
    walletRepository.getCurrent.mockResolvedValue({ walletId: 'w', type: 'keystore', network: 'testnet' })

    await expect(handler.handle(event({ toAddress: DESTINATION, amountDuffs: '10000', password })))
      .rejects.toThrow('only supported for a seedphrase wallet')
  })

  describe('validatePayload', () => {
    it('accepts a well formed payload', () => {
      expect(handler.validatePayload({ toAddress: DESTINATION, amountDuffs: '10000', password })).toBeNull()
    })

    it('rejects a non-positive or non-integer amount', () => {
      expect(handler.validatePayload({ toAddress: DESTINATION, amountDuffs: '0', password })).toMatch(/positive integer/)
      expect(handler.validatePayload({ toAddress: DESTINATION, amountDuffs: '0.5', password })).toMatch(/positive integer/)
    })

    it('rejects a missing recipient or password', () => {
      expect(handler.validatePayload({ toAddress: '', amountDuffs: '10000', password })).toMatch(/Recipient/)
      expect(handler.validatePayload({ toAddress: DESTINATION, amountDuffs: '10000', password: '' })).toMatch(/Password/)
    })
  })
})

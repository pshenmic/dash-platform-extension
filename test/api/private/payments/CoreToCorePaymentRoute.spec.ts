import { PrivateKey, Transaction } from 'dash-core-sdk'
import { CoreToCorePaymentRoute } from '../../../../src/content-script/api/private/payments/CoreToCorePaymentRoute'
import { CoreUtxosService } from '../../../../src/content-script/services/CoreUtxosService'
import { CoreSpendService } from '../../../../src/content-script/services/CoreSpendService'
import { PaymentNotSentError } from '../../../../src/content-script/errors/PaymentNotSentError'
import { CoreAddressChain } from '../../../../src/types/enums/CoreAddressChain'
import { PaymentRequest } from '../../../../src/types/PaymentRequest'
import { PaymentRequestStatus } from '../../../../src/types/enums/PaymentRequestStatus'
import { deriveCoreAddressesFromXpub, deriveCoreAddressKeyAtIndex } from '../../../../src/utils/coreAddresses'
import { coreAddressToScript, deriveWalletHdKey, hexToBytes } from '../../../../src/utils'

jest.mock('../../../../src/utils/coreAddresses', () => {
  const actual = jest.requireActual('../../../../src/utils/coreAddresses')
  return {
    ...actual,
    deriveCoreAddressesFromXpub: jest.fn(),
    deriveCoreAddressKeyAtIndex: jest.fn()
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
const deriveCoreAddressKeyAtIndexMock = deriveCoreAddressKeyAtIndex as jest.MockedFunction<typeof deriveCoreAddressKeyAtIndex>
const deriveWalletHdKeyMock = deriveWalletHdKey as jest.MockedFunction<typeof deriveWalletHdKey>

// Valid testnet addresses, so the real address decoding and signing run.
const RECEIVING = ['yWjF8BxE6xr3hew5FUVNBdZhQLcLQq7Tej', 'yWjGKfvcPT5nPTkqFX7H2EQ764Hp5PrCff']
const CHANGE = ['yVMvvEvrZVRvBcyvG4w8VLbbko3EuPcQLA', 'yVMx7iuEqyfesRogG7Z3KwS1SWiibPVUfh']
const RECIPIENT = 'yVUKAMNURsDaGB4GFZgJUmYBoBJTW32stY'
// One input, recipient plus change: 226 bytes at 1 duff/byte.
const FEE = 226n

describe('Core to Core payment route', () => {
  let coreExplorer: any
  let coreSDK: any
  let walletRepository: any
  let route: CoreToCorePaymentRoute

  const wallet: any = {
    walletId: 'abcdef',
    type: 'seedphrase',
    network: 'testnet',
    label: null,
    encryptedMnemonic: 'encryptedMnemonic',
    seedHash: null,
    currentIdentity: null
  }

  const request = (overrides: Partial<PaymentRequest> = {}): PaymentRequest => ({
    id: 'r1',
    origin: 'https://shop.example',
    network: 'testnet',
    walletId: 'abcdef',
    address: RECIPIENT,
    addressType: 'core',
    amountDuffs: '10000',
    status: PaymentRequestStatus.processing,
    createdAt: Date.now(),
    source: 'core',
    feeDuffs: null,
    transactions: [],
    result: null,
    error: null,
    ...overrides
  })

  const context = (): any => ({ wallet, walletRepository })

  beforeEach(() => {
    jest.clearAllMocks()

    walletRepository = { getCoreAccountXpub: jest.fn(async () => 'tpubAccountXpub') }
    coreExplorer = {
      getXpubSummary: jest.fn(async () => ({ nextUnused: { receiving: 1, change: 1 } })),
      getAddressesUtxos: jest.fn(async () => [{ txid: 'a'.repeat(64), vout: 0, amount: 100_000n, address: RECEIVING[0] }]),
      getOutpointSpender: jest.fn(async () => null)
    }
    coreSDK = {
      broadcastTransaction: jest.fn(async () => ({})),
      getTransaction: jest.fn(async () => { throw new Error('Transaction not found') })
    }

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
    deriveCoreAddressKeyAtIndexMock.mockImplementation(async (_hdKey, _network, _account, chain, index) => {
      const privateKey: any = PrivateKey.fromBytes(new Uint8Array(32).fill(7), 'testnet')
      privateKey.getAddress = (): string => (chain === CoreAddressChain.receiving ? RECEIVING : CHANGE)[index]

      return privateKey
    })
    deriveWalletHdKeyMock.mockReturnValue('walletHdKey' as any)

    const coreUtxos = new CoreUtxosService({} as any, coreExplorer)

    route = new CoreToCorePaymentRoute(new CoreSpendService({} as any, coreSDK, coreUtxos), coreExplorer)
  })

  it('prices the payment as the requested amount plus a fee on top', async () => {
    expect(await route.quote(request(), context())).toEqual({ amountDuffs: 10_000n, feeDuffs: FEE })
  })

  it('signs a transaction that pays the recipient exactly the amount, and sends nothing', async () => {
    const prepared = await route.prepare(request(), context(), 'password')
    const [recorded] = prepared.transactions as any[]
    const transaction = Transaction.fromBytes(hexToBytes(recorded.hex))

    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
    expect(prepared.feeDuffs).toBe(FEE)
    expect(recorded).toMatchObject({ type: 'core', txid: transaction.hash() })
    expect(transaction.outputs[0].satoshis).toBe(10_000n)
    expect(transaction.outputs[0].script.bytes()).toEqual(coreAddressToScript(RECIPIENT, 'testnet').bytes())
    // The fee comes out of the change, not out of what the recipient gets.
    expect(transaction.outputs[1].satoshis).toBe(100_000n - 10_000n - FEE)
  })

  it('sends the recorded bytes, and the very same bytes again on a repeat', async () => {
    const prepared = await route.prepare(request(), context(), 'password')
    const [recorded] = prepared.transactions as any[]
    const signed = request({ transactions: prepared.transactions })

    expect(await route.send(signed, context())).toEqual({ delivery: 'sent', transactions: [{ type: 'core', txid: recorded.txid }] })

    await route.send(signed, context())

    const [first, second] = coreSDK.broadcastTransaction.mock.calls.map(([bytes]: [Uint8Array]) => Buffer.from(bytes).toString('hex'))

    expect(first).toBe(recorded.hex)
    expect(second).toBe(first)
  })

  it('counts a transaction the network already has as sent', async () => {
    const prepared = await route.prepare(request(), context(), 'password')

    coreSDK.broadcastTransaction.mockRejectedValueOnce(new Error('txn-already-known'))
    coreSDK.getTransaction.mockResolvedValueOnce({})

    expect((await route.send(request({ transactions: prepared.transactions }), context())).delivery).toBe('sent')
  })

  it('reports a transaction whose input someone else spent as never sent', async () => {
    const prepared = await route.prepare(request(), context(), 'password')

    coreSDK.broadcastTransaction.mockRejectedValueOnce(new Error('bad-txns-inputs-missingorspent'))
    coreExplorer.getOutpointSpender.mockResolvedValueOnce('c'.repeat(64))

    await expect(route.send(request({ transactions: prepared.transactions }), context())).rejects.toBeInstanceOf(PaymentNotSentError)
  })

  it('leaves the outcome open when the network did not answer', async () => {
    const prepared = await route.prepare(request(), context(), 'password')

    coreSDK.broadcastTransaction.mockRejectedValueOnce(new Error('No node answered'))
    coreExplorer.getOutpointSpender.mockRejectedValueOnce(new Error('Core explorer error'))

    const error = await route.send(request({ transactions: prepared.transactions }), context()).catch(e => e)

    expect(error).not.toBeInstanceOf(PaymentNotSentError)
    expect(error.message).toBe('No node answered')
  })

  it('needs a seed phrase wallet with its Core addresses set up', async () => {
    await expect(route.quote(request(), { ...context(), wallet: { ...wallet, type: 'keystore' } }))
      .rejects.toThrow('only supported for a seedphrase wallet')

    walletRepository.getCoreAccountXpub.mockResolvedValueOnce(null)

    await expect(route.quote(request(), context())).rejects.toThrow('Core addresses of this wallet are not initialized yet')
  })
})

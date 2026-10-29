import { DashPlatformSDK } from 'dash-platform-sdk'
import { Transaction } from 'dash-core-sdk'
import hash from 'hash.js'
import { PrivateKey } from 'eciesjs'
import { PrivateAPIClient, WalletType } from '../../../src/types'
import { PrivateAPI } from '../../../src/content-script/api/PrivateAPI'
import { PublicAPI } from '../../../src/content-script/api/PublicAPI'
import { MessagingMethods } from '../../../src/types/enums/MessagingMethods'
import { MemoryStorageAdapter } from '../../../src/content-script/storage/memoryStorageAdapter'
import { StorageAdapter } from '../../../src/content-script/storage/storageAdapter'
import { PaymentRequestStatus } from '../../../src/types/enums/PaymentRequestStatus'
import { coreAddressToScript } from '../../../src/utils'
import runMigrations from '../../../src/content-script/storage/runMigrations'
import { connectBackend } from '../../helpers/connectBackend'
import { installWebLocks } from '../../helpers/webLocks'

const PASSWORD = 'test'
const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const RECIPIENT = 'yVUKAMNURsDaGB4GFZgJUmYBoBJTW32stY'
const AMOUNT = '10000000'

const json = (body: unknown): any => ({ ok: true, status: 200, json: async () => body })

// A website asks for a payment through the same entry point a page's
// postMessage reaches, and the user settles it through the private client the
// confirmation page uses. Only the network is stubbed: the explorer answers
// with one output on the wallet's first address, and broadcasting is recorded.
describe('a website asks to be paid', () => {
  const origin = 'https://shop.example'

  let uninstallWebLocks: () => void
  let originalFetch: typeof fetch
  let sdk: DashPlatformSDK
  let storage: StorageAdapter
  let publicAPI: PublicAPI
  let privateAPIClient: PrivateAPIClient
  let coreSDK: any
  let walletId: string

  const call = async (method: MessagingMethods, payload: object, from: string = origin): Promise<any> => {
    const event: any = {
      origin: from,
      data: { context: 'dash-platform-extension', id: 'id', type: 'request', method, payload }
    }

    return await publicAPI.handleMessage(event)
  }

  const requestPayment = async (payload: object = {}, from: string = origin): Promise<any> =>
    await call(MessagingMethods.REQUEST_SEND_PAYMENT, { address: RECIPIENT, amountDuffs: AMOUNT, ...payload }, from)

  const confirm = async (id: string): Promise<any> => {
    const quote = await privateAPIClient.estimatePaymentRequest(id, 'core')

    return await privateAPIClient.approvePaymentRequest(id, 'core', quote.feeDuffs, PASSWORD)
  }

  beforeAll(() => {
    uninstallWebLocks = installWebLocks()
    originalFetch = global.fetch
  })

  afterAll(() => {
    uninstallWebLocks()
    global.fetch = originalFetch
  })

  beforeEach(async () => {
    sdk = new DashPlatformSDK({ network: 'testnet' })
    storage = new MemoryStorageAdapter()

    await runMigrations(storage)

    coreSDK = {
      network: 'testnet',
      broadcastTransaction: jest.fn(async () => ({})),
      getTransaction: jest.fn(async () => { throw new Error('Transaction not found') })
    }

    global.fetch = jest.fn(async (url: string) => {
      if (url.endsWith('/xpub')) {
        return json({ nextUnused: { receive: 0, change: 0 } })
      }

      if (url.includes('/addresses/utxo?addresses=')) {
        const [firstAddress] = url.split('addresses=')[1].split(',')

        return json([{ prevTxHash: 'a'.repeat(64), vOutIndex: 0, amount: '100000000', address: firstAddress }])
      }

      return { ok: false, status: 404, json: async () => ({}) }
    }) as any

    const privateAPI = new PrivateAPI(sdk, coreSDK, storage)
    privateAPIClient = new PrivateAPIClient()

    connectBackend(privateAPI)

    await storage.set('network', 'testnet')
    await storage.set('passwordPublicKey', PrivateKey.fromHex(hash.sha256().update(PASSWORD).digest('hex')).publicKey.toHex())

    walletId = (await privateAPIClient.createWallet(WalletType.seedphrase, MNEMONIC)).walletId

    await storage.set('currentWalletId', walletId)

    // Handlers only: the page listener would answer the private client's
    // messages too, because the test bus is shared.
    publicAPI = new PublicAPI(sdk, storage)
    publicAPI.buildHandlers()

    await call(MessagingMethods.CONNECT_APP, { url: origin })
    await privateAPIClient.approveAppConnect(hash.sha256().update(origin).digest('hex').substring(0, 6))
  })

  it('pays a Core address the user confirms and hands the website the txid', async () => {
    const created = await requestPayment()

    expect(created).toEqual({
      id: expect.stringMatching(/^[0-9a-f]{32}$/),
      status: PaymentRequestStatus.pending,
      result: null,
      error: null,
      redirectUrl: expect.any(String)
    })

    const { request, sources, contextChanged } = await privateAPIClient.getPaymentRequest(created.id)

    expect(request).toMatchObject({ origin, network: 'testnet', walletId, address: RECIPIENT, addressType: 'core', amountDuffs: AMOUNT })
    expect(sources).toEqual(['core'])
    expect(contextChanged).toBe(false)

    const quote = await privateAPIClient.estimatePaymentRequest(created.id, 'core')

    expect(quote).toEqual({ source: 'core', amountDuffs: AMOUNT, feeDuffs: '226', totalDuffs: '10000226' })

    await privateAPIClient.approvePaymentRequest(created.id, 'core', quote.feeDuffs, PASSWORD)

    expect(coreSDK.broadcastTransaction).toHaveBeenCalledTimes(1)

    const transaction = Transaction.fromBytes(coreSDK.broadcastTransaction.mock.calls[0][0])

    expect(transaction.outputs[0].satoshis).toBe(BigInt(AMOUNT))
    expect(transaction.outputs[0].script.bytes()).toEqual(coreAddressToScript(RECIPIENT, 'testnet').bytes())

    // Exactly what the website may know: the payment and its transaction.
    expect(await call(MessagingMethods.GET_PAYMENT_STATUS, { id: created.id })).toEqual({
      id: created.id,
      status: PaymentRequestStatus.completed,
      result: {
        id: created.id,
        address: RECIPIENT,
        amountDuffs: AMOUNT,
        delivery: 'sent',
        transactions: [{ type: 'core', txid: transaction.hash() }]
      },
      error: null
    })
  })

  it('pays once, however often the confirmation is repeated', async () => {
    const { id } = await requestPayment()

    const first = await confirm(id)
    const second = await privateAPIClient.approvePaymentRequest(id, 'core', '226')

    expect(second.request.result).toEqual(first.request.result)
    expect(coreSDK.broadcastTransaction).toHaveBeenCalledTimes(1)
  })

  it('makes every request a payment of its own', async () => {
    const first = await requestPayment()
    const second = await requestPayment()

    expect(second.id).not.toBe(first.id)

    await confirm(first.id)

    expect((await call(MessagingMethods.GET_PAYMENT_STATUS, { id: second.id })).status).toBe(PaymentRequestStatus.pending)
  })

  it('takes requests only from a connected website', async () => {
    await expect(requestPayment({}, 'https://elsewhere.example')).rejects.toThrow('Application on url https://elsewhere.example is not authorized')
  })

  it('binds the request to the calling origin and keeps it from every other one', async () => {
    const { id }: { id: string } = await requestPayment({ origin: 'https://elsewhere.example' })

    expect((await privateAPIClient.getPaymentRequest(id)).request.origin).toBe(origin)

    await expect(call(MessagingMethods.GET_PAYMENT_STATUS, { id }, 'https://elsewhere.example')).rejects.toThrow(`Payment request ${id} not found`)
    await expect(call(MessagingMethods.CANCEL_PAYMENT_REQUEST, { id, reason: 'closed' }, 'https://elsewhere.example')).rejects.toThrow(`Payment request ${id} not found`)
  })

  it('refuses a recipient no source can pay yet, before any window opens', async () => {
    const seed = new Uint8Array(64).fill(7)
    const platformAddress = (await sdk.keyPair.derivePlatformAddress(seed, 'testnet', 0, 0)).toBech32m('testnet')
    const orchardAddress = sdk.keyPair.deriveShieldedAddress(seed, 'testnet', 0, 0).toBech32m('testnet')

    await expect(requestPayment({ address: platformAddress })).rejects.toThrow('Payments to a Platform address are not supported yet')
    await expect(requestPayment({ address: orchardAddress })).rejects.toThrow('Payments to an Orchard address are not supported yet')
  })

  it('refuses a malformed request', async () => {
    await expect(requestPayment({ amountDuffs: '0' })).rejects.toThrow('amountDuffs must be a positive integer string of duffs')
    await expect(requestPayment({ amountDuffs: 10000000 })).rejects.toThrow('amountDuffs must be a positive integer string of duffs')
    await expect(requestPayment({ amountDuffs: '546' })).rejects.toThrow('greater than 546 duffs')
    await expect(requestPayment({ address: 'XmainnetAddressThatIsNotValid' })).rejects.toThrow('is not a valid Core, Platform or Orchard address')
  })

  it('rejects the request when the website closes the window first', async () => {
    const { id } = await requestPayment()

    const view = await call(MessagingMethods.CANCEL_PAYMENT_REQUEST, { id, reason: 'closed' })

    expect(view).toMatchObject({ status: PaymentRequestStatus.rejected, error: 'Payment was rejected: the confirmation window was closed' })
    await expect(confirm(id)).rejects.toThrow('can no longer be priced')
    await expect(privateAPIClient.approvePaymentRequest(id, 'core', '226', PASSWORD)).rejects.toThrow('the confirmation window was closed')
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  it('does not let a late cancellation take back a confirmed payment', async () => {
    const { id } = await requestPayment()

    await confirm(id)

    expect((await call(MessagingMethods.CANCEL_PAYMENT_REQUEST, { id, reason: 'closed' })).status).toBe(PaymentRequestStatus.completed)
  })

  it('tells the website when the user rejects it', async () => {
    const { id } = await requestPayment()

    await privateAPIClient.rejectPaymentRequest(id)

    expect(await call(MessagingMethods.GET_PAYMENT_STATUS, { id })).toEqual({
      id, status: PaymentRequestStatus.rejected, result: null, error: 'Payment was rejected by the user'
    })
  })

  describe('after the user switches to another wallet', () => {
    const switchWallet = async (): Promise<void> => {
      const other = await privateAPIClient.createWallet(WalletType.keystore)

      await storage.set('currentWalletId', other.walletId)
    }

    it('cancels a request the user has not confirmed, and the website still learns it', async () => {
      const { id } = await requestPayment()

      await switchWallet()

      expect(await call(MessagingMethods.GET_PAYMENT_STATUS, { id })).toMatchObject({
        status: PaymentRequestStatus.rejected,
        error: 'Payment request was cancelled because the wallet or network changed'
      })

      await storage.set('currentWalletId', walletId)

      // Switching back does not revive it.
      await expect(privateAPIClient.approvePaymentRequest(id, 'core', '226', PASSWORD)).rejects.toThrow('wallet or network changed')
      expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
    })

    it('still lets the website follow a payment made before the switch', async () => {
      const { id } = await requestPayment()

      await confirm(id)
      await switchWallet()

      expect((await call(MessagingMethods.GET_PAYMENT_STATUS, { id })).status).toBe(PaymentRequestStatus.completed)
      // Nothing else is answered without a connection to the current wallet.
      await expect(requestPayment()).rejects.toThrow('is not authorized')
    })
  })
})

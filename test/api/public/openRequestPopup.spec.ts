import { DashPlatformSDK } from 'dash-platform-sdk'
import hash from 'hash.js'
import { PrivateKey } from 'eciesjs'
import { PrivateAPIClient, WalletType } from '../../../src/types'
import { PrivateAPI } from '../../../src/content-script/api/PrivateAPI'
import { PublicAPI } from '../../../src/content-script/api/PublicAPI'
import { MessagingMethods } from '../../../src/types/enums/MessagingMethods'
import { MemoryStorageAdapter } from '../../../src/content-script/storage/memoryStorageAdapter'
import { StorageAdapter } from '../../../src/content-script/storage/storageAdapter'
import { AppConnectStatus } from '../../../src/types/enums/AppConnectStatus'
import { PaymentRequestStatus } from '../../../src/types/enums/PaymentRequestStatus'
import { OPEN_POPUP_MESSAGE } from '../../../src/types/RequestWindow'
import { closeRequestWindow } from '../../../src/background/requestWindows'
import runMigrations from '../../../src/content-script/storage/runMigrations'
import { connectBackend } from '../../helpers/connectBackend'

const PASSWORD = 'test'
const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const RECIPIENT = 'yVUKAMNURsDaGB4GFZgJUmYBoBJTW32stY'

// A website has its request shown in the extension's toolbar popup, which only
// the extension can open: the content script asks the service worker, whose
// answer is stubbed here, and closing the popup is played by the worker's
// handler for it.
describe('a website request shown in the toolbar popup', () => {
  const shop = 'https://shop.example'
  const newcomer = 'https://new.example'

  let storage: StorageAdapter
  let publicAPI: PublicAPI
  let privateAPIClient: PrivateAPIClient
  let opened: string[]
  let popupOpens: boolean

  const call = async (method: MessagingMethods, payload: object, from: string): Promise<any> => {
    const event: any = {
      origin: from,
      data: { context: 'dash-platform-extension', id: 'id', type: 'request', method, payload }
    }

    return await publicAPI.handleMessage(event)
  }

  const connectId = (origin: string): string => hash.sha256().update(origin).digest('hex').substring(0, 6)

  beforeEach(async () => {
    const sdk = new DashPlatformSDK({ network: 'testnet' })
    storage = new MemoryStorageAdapter()

    await runMigrations(storage)

    connectBackend(new PrivateAPI(sdk, {} as any, storage))
    privateAPIClient = new PrivateAPIClient()

    await storage.set('network', 'testnet')
    await storage.set('passwordPublicKey', PrivateKey.fromHex(hash.sha256().update(PASSWORD).digest('hex')).publicKey.toHex())
    await storage.set('currentWalletId', (await privateAPIClient.createWallet(WalletType.seedphrase, MNEMONIC)).walletId)

    publicAPI = new PublicAPI(sdk, storage)
    publicAPI.buildHandlers()

    await call(MessagingMethods.CONNECT_APP, { url: shop }, shop)
    await privateAPIClient.approveAppConnect(connectId(shop))

    // The service worker's side: record what it was asked to open.
    opened = []
    popupOpens = true

    const sendMessage: (message: any) => Promise<any> = chrome.runtime.sendMessage.bind(chrome.runtime)

    jest.spyOn(chrome.runtime, 'sendMessage').mockImplementation(async (message: any) => {
      if (message?.type === OPEN_POPUP_MESSAGE) {
        opened.push(message.path)

        return { ok: popupOpens }
      }

      return await sendMessage(message)
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('opens the popup on the payment page of the website own request', async () => {
    const { id } = await call(MessagingMethods.REQUEST_SEND_PAYMENT, { address: RECIPIENT, amountDuffs: '100000' }, shop)

    expect(await call(MessagingMethods.OPEN_REQUEST_POPUP, { kind: 'payment', id }, shop)).toEqual({ opened: true })
    expect(opened).toEqual([`index.html#/payment/${String(id)}`])
  })

  it('tells the website when the browser would not open the popup', async () => {
    const { id } = await call(MessagingMethods.REQUEST_SEND_PAYMENT, { address: RECIPIENT, amountDuffs: '100000' }, shop)

    popupOpens = false

    expect(await call(MessagingMethods.OPEN_REQUEST_POPUP, { kind: 'payment', id }, shop)).toEqual({ opened: false })
  })

  it('opens nothing for a request of another website or one already settled', async () => {
    const { id } = await call(MessagingMethods.REQUEST_SEND_PAYMENT, { address: RECIPIENT, amountDuffs: '100000' }, shop)

    await expect(call(MessagingMethods.OPEN_REQUEST_POPUP, { kind: 'payment', id }, newcomer)).rejects.toThrow(`Payment request ${String(id)} not found`)

    await call(MessagingMethods.CANCEL_PAYMENT_REQUEST, { id, reason: 'closed' }, shop)

    await expect(call(MessagingMethods.OPEN_REQUEST_POPUP, { kind: 'payment', id }, shop)).rejects.toThrow('is rejected')
    expect(opened).toEqual([])
  })

  it('opens the popup on the connection request of a website not yet connected', async () => {
    await call(MessagingMethods.CONNECT_APP, { url: newcomer }, newcomer)

    expect(await call(MessagingMethods.OPEN_REQUEST_POPUP, { kind: 'connect' }, newcomer)).toEqual({ opened: true })
    expect(opened).toEqual([`index.html#/connect/${connectId(newcomer)}`])
  })

  it('has no connection request to show once the website is connected', async () => {
    await expect(call(MessagingMethods.OPEN_REQUEST_POPUP, { kind: 'connect' }, shop)).rejects.toThrow(`No connection request of ${shop} is waiting for the user`)
  })

  it('declines a payment whose popup closed undecided, and the website learns it', async () => {
    const { id } = await call(MessagingMethods.REQUEST_SEND_PAYMENT, { address: RECIPIENT, amountDuffs: '100000' }, shop)

    await closeRequestWindow(storage, { kind: 'payment', id })

    expect(await call(MessagingMethods.GET_PAYMENT_STATUS, { id }, shop)).toMatchObject({
      status: PaymentRequestStatus.rejected,
      error: 'Payment was rejected: the confirmation window was closed'
    })
  })

  it('tells a website waiting to connect that the popup was closed, and lets it ask again', async () => {
    await call(MessagingMethods.CONNECT_APP, { url: newcomer }, newcomer)

    await closeRequestWindow(storage, { kind: 'connect', id: connectId(newcomer) })

    expect((await call(MessagingMethods.CONNECT_APP, { url: newcomer, waiting: true }, newcomer)).status).toBe(AppConnectStatus.rejected)
    // A new connect() is a new request.
    expect((await call(MessagingMethods.CONNECT_APP, { url: newcomer }, newcomer)).status).toBe(AppConnectStatus.pending)
  })

  it('refuses to show something that is not a request', async () => {
    await expect(call(MessagingMethods.OPEN_REQUEST_POPUP, { kind: 'settings' }, shop)).rejects.toThrow('kind must be connect or payment')
    await expect(call(MessagingMethods.OPEN_REQUEST_POPUP, { kind: 'payment', id: '../settings' }, shop)).rejects.toThrow('id must be a hex string')
  })
})

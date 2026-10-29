import { MemoryStorageAdapter } from '../../src/content-script/storage/memoryStorageAdapter'
import { PaymentRequestsRepository } from '../../src/content-script/repository/PaymentRequestsRepository'
import { closeRequestWindow } from '../../src/background/requestWindows'
import { PaymentRequestStatus } from '../../src/types/enums/PaymentRequestStatus'
import { AppConnectStatus } from '../../src/types/enums/AppConnectStatus'
import { isRequestWindow, isRequestWindowPath, requestWindowPath } from '../../src/types/RequestWindow'
import { applyPaymentCancellation } from '../../src/utils/paymentRequests'

describe('closing the page of a website request', () => {
  const storage = new MemoryStorageAdapter()
  const payments = new PaymentRequestsRepository(storage)
  let sequence = 0
  let id: string

  const payment = async (status: PaymentRequestStatus): Promise<void> => {
    await payments.create({
      id,
      origin: 'https://shop.example',
      network: 'testnet',
      walletId: 'abcdef',
      address: 'yVUKAMNURsDaGB4GFZgJUmYBoBJTW32stY',
      addressType: 'core',
      amountDuffs: '100000',
      status,
      createdAt: Date.now(),
      source: null,
      feeDuffs: null,
      transactions: [],
      result: null,
      error: null
    })
  }

  const connection = async (status: AppConnectStatus): Promise<void> => {
    await storage.set('network', 'testnet')
    await storage.set('currentWalletId', 'abcdef')
    await storage.set('appConnects_testnet_abcdef', { [id]: { id, url: 'https://shop.example', status, identities: [] } })
  }

  const connectionStatus = async (): Promise<string> =>
    (await storage.get('appConnects_testnet_abcdef') as any)[id].status

  beforeEach(() => {
    sequence += 1
    id = `abc${sequence}`
  })

  it('declines a payment the user had not decided, as the website would', async () => {
    await payment(PaymentRequestStatus.pending)

    await closeRequestWindow(storage, { kind: 'payment', id })

    const request = applyPaymentCancellation(await payments.getById(id) as any, await payments.getCancellation(id))

    expect(request.status).toBe(PaymentRequestStatus.rejected)
    expect(request.error).toBe('Payment was rejected: the confirmation window was closed')
  })

  it('leaves a payment the user confirmed to finish', async () => {
    await payment(PaymentRequestStatus.processing)

    await closeRequestWindow(storage, { kind: 'payment', id })

    const request = applyPaymentCancellation(await payments.getById(id) as any, await payments.getCancellation(id))

    expect(request.status).toBe(PaymentRequestStatus.processing)
  })

  it('keeps the reason a payment was first cancelled for', async () => {
    await payment(PaymentRequestStatus.pending)
    await payments.setCancellation(id, { reason: 'expired', cancelledAt: 1 })

    await closeRequestWindow(storage, { kind: 'payment', id })

    expect(await payments.getCancellation(id)).toEqual({ reason: 'expired', cancelledAt: 1 })
  })

  it('rejects a connection the user had not decided', async () => {
    await connection(AppConnectStatus.pending)

    await closeRequestWindow(storage, { kind: 'connect', id })

    expect(await connectionStatus()).toBe(AppConnectStatus.rejected)
  })

  it('keeps a connection the user approved before the popup closed', async () => {
    await connection(AppConnectStatus.approved)

    await closeRequestWindow(storage, { kind: 'connect', id })

    expect(await connectionStatus()).toBe(AppConnectStatus.approved)
  })

  it('opens only the page of a request', () => {
    expect(requestWindowPath({ kind: 'payment', id: 'ab12' })).toBe('index.html#/payment/ab12')
    expect(isRequestWindowPath('index.html#/payment/ab12')).toBe(true)
    expect(isRequestWindowPath('index.html#/connect/ab12')).toBe(true)
    expect(isRequestWindowPath('index.html#/settings')).toBe(false)
    expect(isRequestWindowPath('https://evil.example/#/payment/ab12')).toBe(false)
    expect(isRequestWindowPath('index.html#/payment/ab12/../../settings')).toBe(false)
    expect(isRequestWindow({ kind: 'payment', id: 'ab12' })).toBe(true)
    expect(isRequestWindow({ kind: 'settings', id: 'ab12' })).toBe(false)
    expect(isRequestWindow({ kind: 'payment', id: '../x' })).toBe(false)
  })
})

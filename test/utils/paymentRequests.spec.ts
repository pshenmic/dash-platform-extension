import {
  applyPaymentCancellation,
  isPaymentRequestExpired,
  PAYMENT_ROUTES,
  paymentSourcesFor,
  toPaymentRequestView,
  validatePaymentAmount
} from '../../src/utils/paymentRequests'
import { PaymentRequest } from '../../src/types/PaymentRequest'
import { PaymentRequestStatus } from '../../src/types/enums/PaymentRequestStatus'
import { PAYMENT_REQUEST_TTL_MS } from '../../src/constants'
import { PaymentRouter } from '../../src/content-script/api/private/payments/PaymentRouter'
import { CoreToCorePaymentRoute } from '../../src/content-script/api/private/payments/CoreToCorePaymentRoute'

const request = (overrides: Partial<PaymentRequest> = {}): PaymentRequest => ({
  id: 'r1',
  origin: 'https://shop.example',
  network: 'testnet',
  walletId: 'abcdef',
  address: 'yVUKAMNURsDaGB4GFZgJUmYBoBJTW32stY',
  addressType: 'core',
  amountDuffs: '10000000',
  status: PaymentRequestStatus.pending,
  createdAt: 1_000,
  source: null,
  feeDuffs: null,
  transactions: [],
  result: null,
  error: null,
  ...overrides
})

describe('validatePaymentAmount', () => {
  it('takes a positive integer string of duffs', () => {
    expect(validatePaymentAmount('1')).toBeNull()
    expect(validatePaymentAmount('10000000', 'core')).toBeNull()
  })

  it.each([
    ['0'], ['-5'], ['007'], ['1.5'], [''], [' 1'], ['1e8']
  ])('refuses %p', (amount) => {
    expect(validatePaymentAmount(amount)).toBe('amountDuffs must be a positive integer string of duffs')
  })

  it('refuses anything that is not a string, a number included', () => {
    expect(validatePaymentAmount(10000)).not.toBeNull()
    expect(validatePaymentAmount(10000n)).not.toBeNull()
    expect(validatePaymentAmount(undefined)).not.toBeNull()
  })

  it('refuses more than can exist', () => {
    expect(validatePaymentAmount('2100000000000001')).toMatch('must not exceed')
  })

  it('refuses a Core payment no node would relay', () => {
    expect(validatePaymentAmount('546', 'core')).toMatch('greater than 546 duffs')
    expect(validatePaymentAmount('546', 'platform')).toBeNull()
  })
})

describe('applyPaymentCancellation', () => {
  it('rejects a pending request the website cancelled', () => {
    const cancelled = applyPaymentCancellation(request(), { reason: 'closed', cancelledAt: 2_000 })

    expect(cancelled.status).toBe(PaymentRequestStatus.rejected)
    expect(cancelled.error).toMatch('window was closed')
  })

  it('leaves a request the user confirmed first as it is', () => {
    const confirmed = request({ status: PaymentRequestStatus.processing })

    expect(applyPaymentCancellation(confirmed, { reason: 'closed', cancelledAt: 2_000 })).toBe(confirmed)
  })
})

describe('isPaymentRequestExpired', () => {
  it('expires a request after its time to live', () => {
    expect(isPaymentRequestExpired(request(), 1_000 + PAYMENT_REQUEST_TTL_MS)).toBe(false)
    expect(isPaymentRequestExpired(request(), 1_001 + PAYMENT_REQUEST_TTL_MS)).toBe(true)
  })
})

describe('toPaymentRequestView', () => {
  it('tells the website nothing about the source, the fee or the signed bytes', () => {
    const result = { id: 'r1', address: 'yVUKAMNURsDaGB4GFZgJUmYBoBJTW32stY', amountDuffs: '10000000', delivery: 'sent' as const, transactions: [{ type: 'core' as const, txid: 'b'.repeat(64) }] }
    const view = toPaymentRequestView(request({
      status: PaymentRequestStatus.completed,
      source: 'core',
      feeDuffs: '226',
      transactions: [{ type: 'core', txid: 'b'.repeat(64), hex: '0100' }],
      result
    }))

    expect(view).toEqual({ id: 'r1', status: PaymentRequestStatus.completed, result, error: null })
  })
})

describe('payment routes', () => {
  it('lists Core as the only source, and only for a Core recipient', () => {
    expect(paymentSourcesFor('core')).toEqual(['core'])
    expect(paymentSourcesFor('platform')).toEqual([])
    expect(paymentSourcesFor('orchard')).toEqual([])
  })

  it('has a route the backend can run behind every pair it lists', () => {
    const router = new PaymentRouter([new CoreToCorePaymentRoute({} as any, {} as any)])

    for (const { source, recipient } of PAYMENT_ROUTES) {
      expect(router.get(source, recipient).source).toBe(source)
    }
  })

  it('refuses a pair no route serves, by name', () => {
    const router = new PaymentRouter([new CoreToCorePaymentRoute({} as any, {} as any)])

    expect(() => router.get('platform', 'core')).toThrow('Paying a Core address from Platform funds is not supported yet')
    expect(() => router.get('core', 'orchard')).toThrow('Paying an Orchard address from Core funds is not supported yet')
  })
})

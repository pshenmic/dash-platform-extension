import { requestSendPayment, waitForPayment } from '../../src/injected/requestSendPayment'
import { PaymentRequestStatus } from '../../src/types/enums/PaymentRequestStatus'
import { PAYMENT_PROCESSING_TIMEOUT_MS, PAYMENT_REQUEST_TTL_MS } from '../../src/constants'
import { popupWindow } from '../../src/utils'

jest.mock('../../src/utils', () => {
  const actual = jest.requireActual('../../src/utils')
  return {
    ...actual,
    popupWindow: jest.fn(),
    // Polling without the pause: time is moved by hand below.
    wait: jest.fn(async () => {})
  }
})

const popupWindowMock = popupWindow as jest.MockedFunction<typeof popupWindow>

const result = {
  id: 'r1',
  address: 'yVUKAMNURsDaGB4GFZgJUmYBoBJTW32stY',
  amountDuffs: '10000000',
  delivery: 'sent' as const,
  transactions: [{ type: 'core' as const, txid: 'b'.repeat(64) }]
}

const view = (status: PaymentRequestStatus, extra: object = {}): any => ({ id: 'r1', status, result: null, error: null, ...extra })

describe('requestSendPayment on the page', () => {
  let client: any
  let now: number

  beforeEach(() => {
    jest.clearAllMocks()

    now = 1_000_000
    jest.spyOn(Date, 'now').mockImplementation(() => now)

    // The page the injected script runs in; only the popup helper reads it.
    Object.assign(global, { window: {} })

    client = {
      requestSendPayment: jest.fn(async () => ({ ...view(PaymentRequestStatus.pending), redirectUrl: 'chrome-extension://id/index.html#/payment/r1' })),
      getPaymentStatus: jest.fn(),
      cancelPaymentRequest: jest.fn(),
      openRequestPopup: jest.fn(async () => ({ opened: true }))
    }
  })

  afterEach(() => {
    jest.restoreAllMocks()
    Reflect.deleteProperty(global, 'window')
  })

  it('resolves with the result once the payment is made', async () => {
    client.getPaymentStatus
      .mockResolvedValueOnce(view(PaymentRequestStatus.pending))
      .mockResolvedValueOnce(view(PaymentRequestStatus.processing))
      .mockResolvedValueOnce(view(PaymentRequestStatus.completed, { result }))

    await expect(waitForPayment(client, view(PaymentRequestStatus.pending), () => false)).resolves.toEqual(result)
    expect(client.cancelPaymentRequest).not.toHaveBeenCalled()
  })

  it('rejects with the reason when the user declines', async () => {
    client.getPaymentStatus.mockResolvedValueOnce(view(PaymentRequestStatus.rejected, { error: 'Payment was rejected by the user' }))

    await expect(waitForPayment(client, view(PaymentRequestStatus.pending), () => false)).rejects.toThrow('Payment was rejected by the user')
  })

  it('cancels a request whose window was closed before the user decided', async () => {
    client.cancelPaymentRequest.mockResolvedValueOnce(view(PaymentRequestStatus.rejected, { error: 'Payment was rejected: the confirmation window was closed' }))

    await expect(waitForPayment(client, view(PaymentRequestStatus.pending), () => true)).rejects.toThrow('the confirmation window was closed')
    expect(client.cancelPaymentRequest).toHaveBeenCalledWith('r1', 'closed')
  })

  it('keeps waiting when the user confirmed just before the window closed', async () => {
    client.cancelPaymentRequest.mockResolvedValueOnce(view(PaymentRequestStatus.processing))
    client.getPaymentStatus.mockResolvedValueOnce(view(PaymentRequestStatus.completed, { result }))

    await expect(waitForPayment(client, view(PaymentRequestStatus.pending), () => true)).resolves.toEqual(result)
    expect(client.cancelPaymentRequest).toHaveBeenCalledTimes(1)
  })

  it('cancels a request left waiting too long', async () => {
    client.getPaymentStatus.mockImplementation(async () => {
      now += PAYMENT_REQUEST_TTL_MS + 1

      return view(PaymentRequestStatus.pending)
    })
    client.cancelPaymentRequest.mockResolvedValueOnce(view(PaymentRequestStatus.rejected, { error: 'Payment request expired before it was confirmed' }))

    await expect(waitForPayment(client, view(PaymentRequestStatus.pending), () => false)).rejects.toThrow('expired')
    expect(client.cancelPaymentRequest).toHaveBeenCalledWith('r1', 'expired')
  })

  it('does not suggest a confirmed payment failed when it loses track of it', async () => {
    client.getPaymentStatus.mockRejectedValueOnce('Timed out waiting for response of GET_PAYMENT_STATUS')

    await expect(waitForPayment(client, view(PaymentRequestStatus.processing), () => true))
      .rejects.toThrow('Lost track of payment r1, which was confirmed and may still complete')
  })

  it('gives up on a confirmed payment that never finishes, without calling it failed', async () => {
    client.getPaymentStatus.mockImplementation(async () => {
      now += PAYMENT_PROCESSING_TIMEOUT_MS + 1

      return view(PaymentRequestStatus.processing)
    })

    await expect(waitForPayment(client, view(PaymentRequestStatus.processing), () => true))
      .rejects.toThrow('Payment r1 was confirmed but has not finished yet')
  })

  it('shows the request in the toolbar popup and learns its closing from the extension', async () => {
    client.getPaymentStatus
      .mockResolvedValueOnce(view(PaymentRequestStatus.pending))
      .mockResolvedValueOnce(view(PaymentRequestStatus.rejected, { error: 'Payment was rejected: the confirmation window was closed' }))

    await expect(requestSendPayment(client, { address: result.address, amountDuffs: result.amountDuffs })).rejects.toThrow('the confirmation window was closed')
    expect(client.openRequestPopup).toHaveBeenCalledWith({ kind: 'payment', id: 'r1' })
    expect(popupWindowMock).not.toHaveBeenCalled()
    // No window of its own to watch, so the page does not cancel by itself.
    expect(client.cancelPaymentRequest).not.toHaveBeenCalled()
  })

  it('falls back to a window of its own when the browser will not open the popup', async () => {
    client.openRequestPopup.mockResolvedValueOnce({ opened: false })
    popupWindowMock.mockReturnValue({ closed: false } as any)
    client.getPaymentStatus.mockResolvedValueOnce(view(PaymentRequestStatus.completed, { result }))

    await expect(requestSendPayment(client, { address: result.address, amountDuffs: result.amountDuffs })).resolves.toEqual(result)
    expect(popupWindowMock).toHaveBeenCalledWith('chrome-extension://id/index.html#/payment/r1', 'dashPayment_r1', expect.anything(), 430, 600)
  })

  it('falls back to a window too when the extension cannot be asked', async () => {
    client.openRequestPopup.mockRejectedValueOnce('Could not find handler for method OPEN_REQUEST_POPUP')
    popupWindowMock.mockReturnValue({ closed: true } as any)
    client.cancelPaymentRequest.mockResolvedValueOnce(view(PaymentRequestStatus.rejected, { error: 'Payment was rejected: the confirmation window was closed' }))

    await expect(requestSendPayment(client, { address: result.address, amountDuffs: result.amountDuffs })).rejects.toThrow('the confirmation window was closed')
    expect(client.cancelPaymentRequest).toHaveBeenCalledWith('r1', 'closed')
  })

  it('cancels the request when the browser blocks the window', async () => {
    client.openRequestPopup.mockResolvedValueOnce({ opened: false })
    popupWindowMock.mockReturnValue(null)
    client.cancelPaymentRequest.mockResolvedValueOnce(view(PaymentRequestStatus.rejected))

    await expect(requestSendPayment(client, { address: result.address, amountDuffs: result.amountDuffs })).rejects.toThrow('the browser blocked the popup')
    expect(client.cancelPaymentRequest).toHaveBeenCalledWith('r1', 'closed')
  })

  it('rejects with an Error when the extension refuses the request', async () => {
    client.requestSendPayment.mockRejectedValueOnce('Payments to a Platform address are not supported yet')

    const error = await requestSendPayment(client, { address: 'tdash1...', amountDuffs: '1' }).catch(e => e)

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Payments to a Platform address are not supported yet')
  })
})

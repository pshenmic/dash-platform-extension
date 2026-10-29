import { wait } from '../utils'
import { showRequest } from './showRequest'
import { PAYMENT_POLL_INTERVAL_MS, PAYMENT_PROCESSING_TIMEOUT_MS, PAYMENT_REQUEST_TTL_MS } from '../constants'
import { PublicAPIClient } from '../types/PublicAPIClient'
import { PaymentRequestView } from '../types/PaymentRequest'
import { PaymentRequestStatus } from '../types/enums/PaymentRequestStatus'
import { SendPaymentResult } from '../types/SendPaymentResult'

export interface SendPaymentParams {
  // A Core, Platform or Orchard address of the wallet's current network.
  address: string
  // What the recipient receives, in duffs, as a positive integer string.
  amountDuffs: string
}

// The page-side transport rejects with the bare message; a website gets an Error.
const toError = (e: unknown): Error => e instanceof Error ? e : new Error(String(e))

/**
 * Waits for the user to settle a payment request, and for the payment to finish
 * once they confirm it.
 *
 * While the request is pending, closing the confirmation window or running out
 * of time cancels it. A cancellation never takes back a confirmation that
 * landed first: the extension then answers with the confirmed request, and the
 * wait goes on for its result.
 */
export async function waitForPayment (
  publicAPIClient: PublicAPIClient,
  created: PaymentRequestView,
  isWindowClosed: () => boolean
): Promise<SendPaymentResult> {
  const startedAt = Date.now()
  let processingSince: number | null = null
  let view = created

  while (true) {
    if (view.status === PaymentRequestStatus.completed && view.result != null) {
      return view.result
    }

    if (view.status === PaymentRequestStatus.rejected || view.status === PaymentRequestStatus.failed) {
      throw new Error(view.error ?? `Payment was ${view.status}`)
    }

    if (view.status === PaymentRequestStatus.pending) {
      const closed = isWindowClosed()

      if (closed || Date.now() - startedAt > PAYMENT_REQUEST_TTL_MS) {
        view = await publicAPIClient.cancelPaymentRequest(created.id, closed ? 'closed' : 'expired').catch(e => {
          throw toError(e)
        })

        continue
      }
    } else {
      processingSince = processingSince ?? Date.now()

      if (Date.now() - processingSince > PAYMENT_PROCESSING_TIMEOUT_MS) {
        throw new Error(`Payment ${created.id} was confirmed but has not finished yet. Check its outcome before paying again`)
      }
    }

    await wait(PAYMENT_POLL_INTERVAL_MS)

    try {
      view = await publicAPIClient.getPaymentStatus(created.id)
    } catch (e) {
      // Once confirmed, the payment goes on in the extension whether or not
      // anyone is listening, so say so rather than suggest it failed.
      throw new Error(view.status === PaymentRequestStatus.processing
        ? `Lost track of payment ${created.id}, which was confirmed and may still complete: ${toError(e).message}`
        : toError(e).message)
    }
  }
}

/**
 * Asks the user to pay `amountDuffs` to `address` from a source they choose in
 * the extension. Resolves once the payment is on the network, rejects when the
 * user declines, closes the window, or the payment cannot be made.
 */
export async function requestSendPayment (publicAPIClient: PublicAPIClient, params: SendPaymentParams): Promise<SendPaymentResult> {
  const created = await publicAPIClient.requestSendPayment(params?.address, params?.amountDuffs).catch(e => {
    throw toError(e)
  })

  // A fallback window is named after the request, so two payments in flight
  // each get one rather than the second taking over the first one's.
  const shown = await showRequest(publicAPIClient, { kind: 'payment', id: created.id }, created.redirectUrl, `dashPayment_${created.id}`, window)

  if (!shown.inPopup && shown.window == null) {
    await publicAPIClient.cancelPaymentRequest(created.id, 'closed').catch(() => {})

    throw new Error('Could not open the extension window to confirm the payment: the browser blocked the popup')
  }

  return await waitForPayment(publicAPIClient, created, () => shown.window?.closed === true)
}

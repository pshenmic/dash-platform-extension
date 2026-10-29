import { StorageAdapter } from '../storage/storageAdapter'
import { PaymentCancellation, PaymentRequest } from '../../types/PaymentRequest'

/**
 * Website payment requests, one storage key each.
 *
 * A request is written by two contexts: the content script of the website that
 * asked creates it, and the backend moves it on from there. One key per request
 * keeps a write to one from ever overwriting another, and a request is found by
 * its id alone, whatever wallet or network is current by the time it is read.
 *
 * The website's side never writes the request after creating it. A
 * cancellation goes under a key of its own, so that it cannot race the
 * backend's confirmation of the same request. Storage and the lock around it
 * only: who writes what and when is the handlers' business.
 */
export class PaymentRequestsRepository {
  storageAdapter: StorageAdapter

  constructor (storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter
  }

  async create (request: PaymentRequest): Promise<void> {
    if (await this.getById(request.id) != null) {
      throw new Error(`Payment request ${request.id} already exists`)
    }

    await this.storageAdapter.set(`paymentRequest_${request.id}`, request)
  }

  async getById (id: string): Promise<PaymentRequest | null> {
    return await this.storageAdapter.get(`paymentRequest_${id}`) as PaymentRequest | null
  }

  async save (request: PaymentRequest): Promise<void> {
    await this.storageAdapter.set(`paymentRequest_${request.id}`, request)
  }

  async getCancellation (id: string): Promise<PaymentCancellation | null> {
    return await this.storageAdapter.get(`paymentRequestCancellation_${id}`) as PaymentCancellation | null
  }

  async setCancellation (id: string, cancellation: PaymentCancellation): Promise<void> {
    await this.storageAdapter.set(`paymentRequestCancellation_${id}`, cancellation)
  }

  // Runs `callback` holding this request alone, or refuses at once when
  // something else holds it. Web Locks span every document of the extension, so
  // a second confirmation - a double click, a repeated message, another backend
  // document - is turned away instead of queued up to pay a second time.
  async withLock<T> (id: string, callback: () => Promise<T>): Promise<T> {
    if (typeof navigator === 'undefined' || navigator.locks == null) {
      throw new Error('Payment requests require Web Locks support')
    }

    return await navigator.locks.request(`paymentRequest_${id}`, { ifAvailable: true }, async (lock) => {
      if (lock == null) {
        throw new Error(`Payment request ${id} is already being processed`)
      }

      return await callback()
    })
  }
}

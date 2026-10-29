import { StorageAdapter } from '../content-script/storage/storageAdapter'
import { PaymentRequestsRepository } from '../content-script/repository/PaymentRequestsRepository'
import { AppConnectRepository } from '../content-script/repository/AppConnectRepository'
import { AppConnectStatus } from '../types/enums/AppConnectStatus'
import { RequestWindow } from '../types/RequestWindow'

/**
 * The user closed the page of a website's request. If they had not decided it,
 * that is a no, and the website waiting on it learns so; a request already
 * decided keeps its outcome.
 *
 * A payment is declined the way the website's own side declines it - through
 * its cancellation, which never takes back a confirmation that came first.
 */
export async function closeRequestWindow (storage: StorageAdapter, window: RequestWindow): Promise<void> {
  if (window.kind === 'payment') {
    const paymentRequests = new PaymentRequestsRepository(storage)

    if (await paymentRequests.getById(window.id) != null && await paymentRequests.getCancellation(window.id) == null) {
      await paymentRequests.setCancellation(window.id, { reason: 'closed', cancelledAt: Date.now() })
    }

    return
  }

  const appConnects = new AppConnectRepository(storage)
  const appConnect = await appConnects.getById(window.id)

  if (appConnect?.status === AppConnectStatus.pending) {
    await appConnects.setStatus(window.id, AppConnectStatus.rejected)
  }
}

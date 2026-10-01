import { PageEvent, PageState } from '../types/PageState'
import { diffPageState } from '../utils/diffPageState'
import { PageStateService } from './services/PageStateService'

// Storage keys that can change what a website sees: the selected network and
// wallet, the connections themselves, and each wallet's identities and current
// identity.
const PAGE_STATE_KEYS = ['network', 'currentWalletId']
const PAGE_STATE_PREFIXES = ['appConnects_', 'identities_', 'wallet_']

export const isPageStateKey = (key: string): boolean =>
  PAGE_STATE_KEYS.includes(key) || PAGE_STATE_PREFIXES.some(prefix => key.startsWith(prefix))

/**
 * Tells one website when what it may see has changed.
 *
 * `refresh` takes a new snapshot and emits the difference from what the page
 * was last told; the first call only records the baseline, so a page that just
 * loaded is not told that everything changed. Calls are serialized, because two
 * storage writes in a row would otherwise race and emit the difference twice.
 *
 * What the page was told is not the same as the last snapshot: while a website
 * has no access, changes are none of its business and nothing is sent, so the
 * network may change twice before it may look again. Comparing against the
 * delivered state is what makes it hear about that on the way back in.
 */
export const createPageStateWatcher = (
  pageStateService: PageStateService,
  origin: string,
  emit: (event: PageEvent) => void
): { refresh: () => Promise<void> } => {
  let delivered: PageState | null = null
  let pending: Promise<void> = Promise.resolve()

  const update = async (): Promise<void> => {
    const next = await pageStateService.snapshot(origin)

    if (delivered == null) {
      delivered = next

      return
    }

    const events = diffPageState(delivered, next)

    if (events.length === 0) {
      return
    }

    for (const event of events) {
      emit(event)
    }

    delivered = next
  }

  return {
    refresh: async (): Promise<void> => {
      pending = pending.catch(() => {}).then(update)

      await pending
    }
  }
}

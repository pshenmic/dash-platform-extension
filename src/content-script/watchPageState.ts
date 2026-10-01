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
 * `refresh` takes a new snapshot and emits the difference from the previous
 * one; the first call only records the baseline, so a page that just loaded is
 * not told that everything changed. Calls are serialized, because two storage
 * writes in a row would otherwise race and emit the difference twice.
 */
export const createPageStateWatcher = (
  pageStateService: PageStateService,
  origin: string,
  emit: (event: PageEvent) => void
): { refresh: () => Promise<void> } => {
  let previous: PageState | null = null
  let pending: Promise<void> = Promise.resolve()

  const update = async (): Promise<void> => {
    const next = await pageStateService.snapshot(origin)

    if (previous != null) {
      for (const event of diffPageState(previous, next)) {
        emit(event)
      }
    }

    previous = next
  }

  return {
    refresh: async (): Promise<void> => {
      pending = pending.catch(() => {}).then(update)

      await pending
    }
  }
}

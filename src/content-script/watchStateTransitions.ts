import { PageEvent, PageEventName } from '../types/PageState'
import { StateTransitionStatus } from '../types/enums/StateTransitionStatus'
import { StateTransitionsRepository } from './repository/StateTransitionsRepository'
import { StateTransitionRequests } from './services/StateTransitionRequests'

export const isStateTransitionKey = (key: string): boolean => key.startsWith('stateTransitions_')

/**
 * Tells a page when the user answered one of its signing requests, so the page
 * does not have to ask again every half second.
 *
 * Only the requests this page sent are followed, and a request is dropped once
 * it is answered: the website learns nothing about what the user signs
 * elsewhere.
 */
export const createStateTransitionWatcher = (
  stateTransitionsRepository: StateTransitionsRepository,
  requests: StateTransitionRequests,
  emit: (event: PageEvent) => void
): { refresh: () => Promise<void> } => {
  let pending: Promise<void> = Promise.resolve()

  const update = async (): Promise<void> => {
    for (const unsignedHash of [...requests.hashes]) {
      const stateTransition = await stateTransitionsRepository.getByHash(unsignedHash)

      if (stateTransition == null || stateTransition.status === StateTransitionStatus.pending) {
        continue
      }

      requests.forget(unsignedHash)

      emit({
        event: PageEventName.stateTransitionResolved,
        payload: { unsignedHash, status: stateTransition.status }
      })
    }
  }

  return {
    refresh: async (): Promise<void> => {
      pending = pending.catch(() => {}).then(update)

      await pending
    }
  }
}

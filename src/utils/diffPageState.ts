import { PageEvent, PageEventName, PageState } from '../types/PageState'

const sameIdentities = (previous: PageState, next: PageState): boolean =>
  previous.identities.length === next.identities.length &&
  previous.identities.every((identity, index) => identity.identifier === next.identities[index].identifier)

/**
 * What to tell a website after something in the extension changed.
 *
 * A website that was never connected is told nothing at all - storage changes
 * are none of its business. A connection that stops being approved under the
 * same wallet was revoked, which is a disconnect; losing access because the
 * user switched wallet is not, so that only empties the identity list.
 */
export const diffPageState = (previous: PageState, next: PageState): PageEvent[] => {
  if (!previous.approved && !next.approved) {
    return []
  }

  const events: PageEvent[] = []

  if (previous.network !== next.network) {
    events.push({ event: PageEventName.networkChanged, payload: { network: next.network } })
  }

  if (!sameIdentities(previous, next) || previous.currentIdentity !== next.currentIdentity) {
    events.push({
      event: PageEventName.identitiesChanged,
      payload: { identities: next.identities, currentIdentity: next.currentIdentity }
    })
  }

  if (previous.approved && !next.approved && previous.network === next.network && previous.walletId === next.walletId) {
    events.push({ event: PageEventName.disconnect, payload: {} })
  }

  return events
}

import { PageEvent, PageEventName, PageState } from '../types/PageState'

const sameIdentities = (previous: PageState, next: PageState): boolean =>
  previous.identities.length === next.identities.length &&
  previous.identities.every((identity, index) => identity.identifier === next.identities[index].identifier)

/**
 * What to tell a website after something in the extension changed.
 *
 * A website that is not connected is told nothing at all - storage changes are
 * none of its business. Losing access under the same wallet and network means
 * the user took the grant away, which is a disconnect; losing it because they
 * switched wallet or network is not, so that only empties the identity list.
 */
export const diffPageState = (previous: PageState, next: PageState): PageEvent[] => {
  const events: PageEvent[] = []

  // The answer to the website's own connection request, which it hears even
  // before it has access - it is the one waiting for it.
  if (previous.status !== next.status) {
    events.push({ event: PageEventName.connectionStatusChanged, payload: { status: next.status } })
  }

  if (!previous.connected && !next.connected) {
    return events
  }

  if (previous.network !== next.network) {
    events.push({ event: PageEventName.networkChanged, payload: { network: next.network } })
  }

  if (!sameIdentities(previous, next) || previous.currentIdentity !== next.currentIdentity) {
    events.push({
      event: PageEventName.identitiesChanged,
      payload: { identities: next.identities, currentIdentity: next.currentIdentity }
    })
  }

  if (previous.connected && !next.connected && previous.network === next.network && previous.walletId === next.walletId) {
    events.push({ event: PageEventName.disconnect, payload: {} })
  }

  return events
}

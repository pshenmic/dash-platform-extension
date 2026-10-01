import { IdentityInfo } from './IdentityInfo'

// What one website may see of the wallet at a moment in time. Everything in it
// is already filtered by that website's grant, so it can be handed to the page
// as is.
export interface PageState {
  network: string | null
  walletId: string | null
  // The connection is approved and leaves the website at least one identity to
  // act as. An approved connection with nothing granted can do nothing, so it
  // does not count as connected.
  connected: boolean
  identities: IdentityInfo[]
  currentIdentity: string | null
}

export enum PageEventName {
  // The identities the website may see, or which of them is current, changed.
  identitiesChanged = 'identitiesChanged',
  // The extension switched to another network.
  networkChanged = 'networkChanged',
  // The website lost its access: the grant was taken away, or the connection
  // was rejected or removed.
  disconnect = 'disconnect'
}

export interface PageEvent {
  event: PageEventName
  payload: object
}

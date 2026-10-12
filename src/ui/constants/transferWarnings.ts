// Caution copy shared by the send form and the transfer confirmation screen,
// so each message is worded in exactly one place.

// Zero-knowledge proving is CPU-heavy and blocks the popup for minutes.
export const PROVING_NOTE = 'Building the zero-knowledge proof runs in this window and can take several minutes.'
export const PROVING_WARNING = `${PROVING_NOTE} Do not close the extension until it finishes.`

// Leaving Platform for Core (L1).
export const WITHDRAW_TO_CORE_WARNING = 'This withdrawal leaves Platform for the Dash (L1) network. It is irreversible, pays an additional L1 network fee on top of the platform fee, and can take several minutes to appear on L1.'

// Withdrawing from the pool to Core loses the exit's privacy.
export const SHIELDED_WITHDRAW_WARNING = 'Withdrawing to Core reveals the amount and the destination on L1 — the privacy of this exit is lost. It is irreversible and pays an additional L1 network fee.'

// Receiving on the wrong layer is the easiest way to lose funds: Platform
// addresses and identities take credits, not L1 Dash. The title carries the
// rule, the body only what happens when it is broken - the destination row
// above already says which layer this is.
export const RECEIVE_PLATFORM_LAYER_NOTICE = {
  title: 'Credits Only',
  text: 'Dash sent here from an exchange or an L1 wallet will not arrive. Top up an identity from Core instead.'
}
export const RECEIVE_CORE_LAYER_NOTICE = {
  title: 'Dash Only',
  text: 'This is a Dash (L1) address. Platform credits cannot be sent here - use a platform address or an identity for those.'
}

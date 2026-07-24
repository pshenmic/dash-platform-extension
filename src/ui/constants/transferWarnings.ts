// Caution copy shared by the send form and the transfer confirmation screen,
// so each message is worded in exactly one place.

// Zero-knowledge proving is CPU-heavy and blocks the popup for minutes.
export const PROVING_NOTE = 'Building the zero-knowledge proof runs in this window and can take several minutes.'
export const PROVING_WARNING = `${PROVING_NOTE} Do not close the extension until it finishes.`

// Leaving Platform for Core (L1).
export const WITHDRAW_TO_CORE_WARNING = 'This withdrawal leaves Platform for the Dash (L1) network. It is irreversible, pays an additional L1 network fee on top of the platform fee, and can take several minutes to appear on L1.'

// Unshielding to a transparent address exposes the amount.
export const UNSHIELD_REVEAL_WARNING = 'The unshielded amount becomes visible on the receiving address.'

// Withdrawing from the pool to Core loses the exit's privacy.
export const SHIELDED_WITHDRAW_WARNING = 'Withdrawing to Core reveals the amount and the destination on L1 — the privacy of this exit is lost. It is irreversible and pays an additional L1 network fee.'

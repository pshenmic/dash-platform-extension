// A spend from the shielded pool. Each kind is charged a different fee: an unshield
// also pays for the address it credits, a withdrawal for the document it inserts.
export type ShieldedSpendKind = 'transfer' | 'unshield' | 'withdrawal'

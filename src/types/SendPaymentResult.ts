// One transaction a payment put on the network, in the shape the rest of the
// API already names them: a Core transaction by its txid, a Platform state
// transition by its hash.
export type PaymentTransaction =
  | { type: 'core', txid: string }
  | { type: 'platform', stateTransitionHash: string }

// What `requestSendPayment` resolves with. It names the payment and the
// transactions that made it, and nothing about where the money came from.
export interface SendPaymentResult {
  // The extension's id for this payment request. Every call is a payment of its
  // own, so two requests for the same address and amount have different ids.
  id: string
  // The recipient as the extension parsed it, and what it receives, in duffs.
  // Fees are paid by the sender on top of this amount.
  address: string
  amountDuffs: string
  // 'sent' - the transaction that pays the recipient is on the network.
  // 'queued' - Platform accepted a withdrawal that pays the recipient later;
  // no Core transaction to the recipient exists yet.
  delivery: 'sent' | 'queued'
  // In the order they were made. A payment that has to cross from one layer to
  // another takes several.
  transactions: PaymentTransaction[]
}

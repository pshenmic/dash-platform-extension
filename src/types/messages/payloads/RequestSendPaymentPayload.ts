export interface RequestSendPaymentPayload {
  // A Core, Platform or Orchard address of the wallet's current network.
  address: string
  // What the recipient receives, in duffs; bigint does not cross the messaging
  // boundary. Fees are paid on top of it.
  amountDuffs: string
}

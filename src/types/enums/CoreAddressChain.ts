// BIP44 chain (the `change` path element) of a Core address: `receiving` is the
// external chain handed out to payers, `change` the internal one that receives
// change outputs. Named rather than numeric so it stays readable when it crosses
// the messaging boundary; the util maps it to the BIP44 index.
export enum CoreAddressChain {
  receiving = 'receiving',
  change = 'change'
}

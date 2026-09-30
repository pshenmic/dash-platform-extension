export interface ListCoreUtxosResponse {
  // One entry per spendable output of the account. `address` and `txid` are what
  // an asset lock is funded with; every output of that transaction paying to that
  // address is spent together, which is why the amount is shown per output.
  utxos: Array<{ address: string, txid: string, vout: number, amountDuffs: string }>
}

export interface ListCoreUtxosResponse {
  // Amounts are strings: bigint does not cross the messaging boundary.
  utxos: Array<{ address: string, txid: string, vout: number, amountDuffs: string }>
}

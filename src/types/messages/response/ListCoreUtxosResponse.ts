export interface CoreUtxoEntry {
  txid: string
  vout: number
  address: string
  // duffs; bigint does not cross the messaging boundary
  amount: string
  // Absent while the output is still waiting for its block: change of a send
  // made moments ago has no height or time yet.
  blockHeight: number | null
  confirmations: number | null
  // Milliseconds since the epoch, as Date accepts it.
  timestamp: number | null
}

export interface ListCoreUtxosResponse {
  // Only what can be spent now: outputs a just-broadcast send of ours consumed
  // are already gone from here, and the change it paid us is already in.
  utxos: CoreUtxoEntry[]
}

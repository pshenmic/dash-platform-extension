export interface CoreTransferOutputPayload {
  address: string
  // duffs; bigint does not cross the messaging boundary
  amountDuffs: string
}

export interface CoreOutpointPayload {
  txid: string
  vout: number
}

export interface EstimateCoreTransferPayload {
  // One entry per recipient. Under `sendMax` exactly one, whose amount is
  // ignored.
  outputs: CoreTransferOutputPayload[]
  // Spend only this address of the wallet; without it the whole account pays.
  fromAddress?: string
  // Spend exactly these outputs, in this order - coin control. They come from
  // LIST_CORE_UTXOS.
  inputs?: CoreOutpointPayload[]
  // Must be one of the wallet's own addresses; without it the next free internal
  // address is used.
  changeAddress?: string
  // 'assetLock' also prices the asset lock transaction that would spend the
  // deposit this payment creates, which is how much a Core to Platform
  // operation really costs. Defaults to 'transfer'.
  type?: 'transfer' | 'assetLock'
  // Price paying out everything the inputs hold, less the fee - what a Max
  // button needs.
  sendMax?: boolean
}

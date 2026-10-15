import { CoreOutpointPayload, CoreTransferOutputPayload } from './EstimateCoreTransferPayload'

export interface SendCoreTransactionPayload {
  // One entry per recipient. Under `sendMax` exactly one, whose amount is
  // ignored.
  outputs: CoreTransferOutputPayload[]
  password: string
  fromAddress?: string
  // Spend exactly these outputs, in this order - coin control.
  inputs?: CoreOutpointPayload[]
  // Must be one of the wallet's own addresses.
  changeAddress?: string
  // Pay out everything the inputs hold, less the fee.
  sendMax?: boolean
}

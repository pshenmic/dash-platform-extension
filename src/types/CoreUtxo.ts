import { CoreAddressEntry } from '../utils/coreAddresses'

export interface CoreUtxo extends CoreAddressEntry {
  txid: string
  vout: number
  amount: string
  confirmations?: number
  isInstantLocked?: boolean
  isChainLocked?: boolean
}

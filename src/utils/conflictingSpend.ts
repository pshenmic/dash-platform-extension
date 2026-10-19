import { Transaction } from 'dash-core-sdk'
import { hexToBytes } from './index'
import { CoreExplorerService } from '../content-script/services/CoreExplorerService'
import { NetworkType } from '../types/NetworkType'

/**
 * The transaction that took one of this payment's inputs, or null if none did.
 *
 * A recorded payment the network does not have is usually just unseen: it can be
 * sitting in a mempool this node has not reached, and sending it again is all it
 * needs. One case is different. Once another transaction has spent one of its
 * inputs, it can never confirm, however long it is waited for, and re-sending it
 * only earns a conflict from every node.
 *
 * That is the line between "wait" and "pay again", and it is drawn from the
 * signed payment itself: its inputs are known, so the explorer can say who holds
 * them now.
 */
export const findConflictingSpend = async (
  coreExplorer: CoreExplorerService,
  fundingTxid: string,
  fundingTxHex: string,
  network: NetworkType
): Promise<string | null> => {
  const transaction = Transaction.fromBytes(hexToBytes(fundingTxHex))

  for (const input of transaction.inputs) {
    const spender = await coreExplorer.getOutpointSpender(input.txId, input.vOut, network)

    if (spender != null && spender !== fundingTxid) {
      return spender
    }
  }

  return null
}

import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { CoreExplorerService } from '../../../services/CoreExplorerService'
import { NetworkType } from '../../../../types/PlatformExplorer'
import { summarizeCoreTransaction } from '../../../../utils/coreTransactions'
import { CORE_EXPLORER_MAX_PAGE_LIMIT, CORE_TRANSACTIONS_DEFAULT_LIMIT } from '../../../../constants'
import { GetCoreTransactionsPayload } from '../../../../types/messages/payloads/GetCoreTransactionsPayload'
import { GetCoreTransactionsResponse } from '../../../../types/messages/response/GetCoreTransactionsResponse'

// Lists the wallet's Core (L1) transactions by account xpub, one page at a time.
// The explorer walks the xpub's own chains, so the history covers every address
// the account derives, including ones created in another install on the same
// seed. Each transaction is summarized against the account's addresses — the
// same set the explorer matched it by — into a direction, the net amount and the
// fee. Needs no password: the xpub is cached.
export class GetCoreTransactionsHandler implements APIHandler {
  walletRepository: WalletRepository
  coreExplorer: CoreExplorerService

  constructor (walletRepository: WalletRepository, coreExplorer: CoreExplorerService) {
    this.walletRepository = walletRepository
    this.coreExplorer = coreExplorer
  }

  async handle (event: EventData): Promise<GetCoreTransactionsResponse> {
    const payload: GetCoreTransactionsPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const account = 0
    const xpub = await this.walletRepository.getCoreAccountXpub(account)

    if (xpub == null) {
      throw new Error('Core xpub is not initialized. Call INIT_ACCOUNT_XPUBS with the wallet password after unlocking')
    }

    const network = wallet.network as NetworkType
    const limit = payload.limit ?? CORE_TRANSACTIONS_DEFAULT_LIMIT

    const [addresses, page] = await Promise.all([
      this.coreExplorer.getXpubAddresses(xpub, network),
      this.coreExplorer.getXpubTransactions(xpub, network, limit, payload.cursor)
    ])

    const walletAddresses = new Set(addresses)

    // Amounts cross the messaging boundary as strings; bigint does not serialize.
    return {
      transactions: page.transactions.map((transaction) => {
        const effect = summarizeCoreTransaction(transaction, walletAddresses)

        return {
          hash: transaction.hash,
          type: transaction.type,
          blockHeight: transaction.blockHeight,
          timestamp: transaction.timestamp,
          confirmations: transaction.confirmations,
          instantLocked: transaction.instantLocked,
          chainLocked: transaction.chainLocked,
          direction: effect.direction,
          amountDuffs: effect.amountDuffs.toString(),
          receivedDuffs: effect.receivedDuffs.toString(),
          sentDuffs: effect.sentDuffs.toString(),
          feeDuffs: effect.feeDuffs?.toString() ?? null,
          counterparties: effect.counterparties
        }
      }),
      nextCursor: page.nextCursor
    }
  }

  validatePayload (payload: GetCoreTransactionsPayload): string | null {
    if (payload.limit != null && (!Number.isInteger(payload.limit) || payload.limit < 1 || payload.limit > CORE_EXPLORER_MAX_PAGE_LIMIT)) {
      return `limit must be an integer between 1 and ${CORE_EXPLORER_MAX_PAGE_LIMIT}`
    }
    if (payload.cursor != null && (typeof payload.cursor !== 'string' || !/^[0-9a-fA-F]{64}$/.test(payload.cursor))) {
      return 'cursor must be the nextCursor of a previous page'
    }

    return null
  }
}

import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { CoreExplorerService } from '../../../services/CoreExplorerService'
import { NetworkType } from '../../../../types/PlatformExplorer'
import { GetCoreTransactionsPayload } from '../../../../types/messages/payloads/GetCoreTransactionsPayload'
import { GetCoreTransactionsResponse } from '../../../../types/messages/response/GetCoreTransactionsResponse'

// Lists Core (L1) transactions touching this wallet, newest first. Asked for by
// account xpub, so it covers every address the seed derives — including ones
// created by another install, which a locally kept list would miss. Needs no
// password: the xpub is cached.
export class GetCoreTransactionsHandler implements APIHandler {
  walletRepository: WalletRepository
  coreExplorer: CoreExplorerService

  constructor (walletRepository: WalletRepository, coreExplorer: CoreExplorerService) {
    this.walletRepository = walletRepository
    this.coreExplorer = coreExplorer
  }

  async handle (event: EventData): Promise<GetCoreTransactionsResponse> {
    const payload: GetCoreTransactionsPayload = event.payload ?? {}
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const xpub = await this.walletRepository.getCoreAccountXpub(0)

    if (xpub == null) {
      throw new Error('Core xpub is not initialized. Call INIT_CORE_XPUB with the wallet password first')
    }

    const { transactions, nextCursor } = await this.coreExplorer.getXpubTransactions(
      xpub, wallet.network as NetworkType, payload.limit, payload.cursor
    )

    return { transactions, nextCursor }
  }

  validatePayload (payload: GetCoreTransactionsPayload): string | null {
    if (payload?.limit != null && (!Number.isInteger(payload.limit) || payload.limit <= 0)) {
      return 'Limit must be a positive integer'
    }
    if (payload?.cursor != null && (typeof payload.cursor !== 'string' || payload.cursor.length === 0)) {
      return 'Cursor must be a non-empty string'
    }

    return null
  }
}

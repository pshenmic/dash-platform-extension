import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { CoreExplorerService } from '../../../services/CoreExplorerService'
import { NetworkType } from '../../../../types/PlatformExplorer'
import { EmptyPayload } from '../../../../types/messages/payloads/EmptyPayload'
import { GetCoreBalanceResponse } from '../../../../types/messages/response/GetCoreBalanceResponse'

// Reads the wallet's Core (L1) balance from the block explorer by account xpub,
// rather than by listing addresses and asking about each one. The explorer walks
// the xpub's own chains, so the total covers every address it derives — including
// ones created in another install on the same seed, which a locally derived list
// would miss. Needs no password: the xpub is cached.
export class GetCoreBalanceHandler implements APIHandler {
  walletRepository: WalletRepository
  coreExplorer: CoreExplorerService

  constructor (walletRepository: WalletRepository, coreExplorer: CoreExplorerService) {
    this.walletRepository = walletRepository
    this.coreExplorer = coreExplorer
  }

  async handle (): Promise<GetCoreBalanceResponse> {
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const account = 0
    const xpub = await this.walletRepository.getCoreAccountXpub(account)

    if (xpub == null) {
      throw new Error('Core xpub is not initialized. Call INIT_ACCOUNT_XPUBS with the wallet password after unlocking')
    }

    const summary = await this.coreExplorer.getXpubSummary(xpub, wallet.network as NetworkType)

    // Amounts cross the messaging boundary as strings; bigint does not serialize.
    return {
      balance: summary.balance.toString(),
      received: summary.received.toString(),
      sent: summary.sent.toString(),
      txCount: summary.txCount,
      usedAddressCount: summary.usedAddressCount,
      nextUnused: summary.nextUnused
    }
  }

  validatePayload (payload: EmptyPayload): string | null {
    if ('account' in payload) {
      return 'Account is not supported'
    }

    return null
  }
}

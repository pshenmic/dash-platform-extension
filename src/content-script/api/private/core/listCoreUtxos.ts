import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { CoreUtxosService } from '../../../services/CoreUtxosService'
import { EmptyPayload } from '../../../../types/messages/payloads/EmptyPayload'
import { ListCoreUtxosResponse } from '../../../../types/messages/response/ListCoreUtxosResponse'

// The account's spendable Core outputs. What is listed here is what a send
// would pick from and what the balance counts, down to the same outputs: all
// three read the wallet through CoreUtxosService.
//
// An output named here is also what the caller passes to REGISTER_IDENTITY or
// TOP_UP_IDENTITY to fund an asset lock with the wallet's own coins.
export class ListCoreUtxosHandler implements APIHandler {
  walletRepository: WalletRepository
  coreUtxos: CoreUtxosService

  constructor (walletRepository: WalletRepository, coreUtxos: CoreUtxosService) {
    this.walletRepository = walletRepository
    this.coreUtxos = coreUtxos
  }

  async handle (): Promise<ListCoreUtxosResponse> {
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const xpub = await this.walletRepository.getCoreAccountXpub(0)

    if (xpub == null) {
      return { utxos: [] }
    }

    const { utxos } = await this.coreUtxos.spendable(wallet, xpub)

    // Newest first: a freshly received output is the one a user looks for.
    return {
      utxos: utxos
        .map(utxo => ({
          txid: utxo.txid,
          vout: utxo.vout,
          address: utxo.address,
          amount: utxo.amount.toString(),
          blockHeight: utxo.blockHeight ?? null,
          confirmations: utxo.confirmations ?? null,
          timestamp: utxo.timestamp ?? null
        }))
        .sort((a, b) => (b.timestamp ?? Number.MAX_SAFE_INTEGER) - (a.timestamp ?? Number.MAX_SAFE_INTEGER))
    }
  }

  validatePayload (payload: EmptyPayload): string | null {
    if ('account' in payload) {
      return 'Account is not supported'
    }

    return null
  }
}

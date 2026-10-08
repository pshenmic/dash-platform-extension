import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { CoreExplorerService } from '../../../services/CoreExplorerService'
import { NetworkType } from '../../../../types/PlatformExplorer'
import { EmptyPayload } from '../../../../types/messages/payloads/EmptyPayload'
import { ListCoreUtxosResponse } from '../../../../types/messages/response/ListCoreUtxosResponse'

// The account's spendable Core outputs, read by xpub. An output listed here is
// what the caller names when funding an asset lock from the wallet's own coins.
export class ListCoreUtxosHandler implements APIHandler {
  walletRepository: WalletRepository
  coreExplorer: CoreExplorerService

  constructor (walletRepository: WalletRepository, coreExplorer: CoreExplorerService) {
    this.walletRepository = walletRepository
    this.coreExplorer = coreExplorer
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

    const utxos = await this.coreExplorer.getXpubUtxos(xpub, wallet.network as NetworkType)

    return {
      utxos: utxos.map(utxo => ({
        address: utxo.address,
        txid: utxo.txid,
        vout: utxo.vout,
        amountDuffs: utxo.amount.toString()
      }))
    }
  }

  validatePayload (payload: EmptyPayload): string | null {
    if ('account' in payload) {
      return 'Account is not supported'
    }

    return null
  }
}

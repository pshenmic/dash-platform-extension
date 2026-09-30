import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { CoreExplorerService } from '../../../services/CoreExplorerService'
import { EmptyPayload } from '../../../../types/messages/payloads/EmptyPayload'
import { ListCoreUtxosResponse } from '../../../../types/messages/response/ListCoreUtxosResponse'

// The account's spendable Core (L1) outputs, read by xpub so the list covers
// every address the account derives. It is what a caller picks from when funding
// an asset lock with the wallet's own coins: an output named here can be passed
// to REGISTER_IDENTITY or TOP_UP_IDENTITY as its address and txid. Needs no
// password - the xpub is cached.
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
      throw new Error('Core xpub is not initialized. Call INIT_ACCOUNT_XPUBS with the wallet password after unlocking')
    }

    const utxos = await this.coreExplorer.getXpubUtxos(xpub, wallet.network)

    // Amounts cross the messaging boundary as strings; bigint does not serialize.
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

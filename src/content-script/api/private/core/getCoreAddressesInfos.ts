import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { CoreExplorerService } from '../../../services/CoreExplorerService'
import { NetworkType } from '../../../../types/PlatformExplorer'
import { GetCoreAddressesInfosPayload } from '../../../../types/messages/payloads/GetCoreAddressesInfosPayload'
import { GetCoreAddressesInfosResponse } from '../../../../types/messages/response/GetCoreAddressesInfosResponse'

// Fetches balance and transaction counters for a batch of Core (L1) addresses
// from the block explorer. Addresses never seen on-chain come back as zeros.
// Amounts are duffs and cross the messaging boundary as strings (bigint does not
// serialize); the consumer re-parses them with BigInt(...).
export class GetCoreAddressesInfosHandler implements APIHandler {
  walletRepository: WalletRepository
  coreExplorer: CoreExplorerService

  constructor (walletRepository: WalletRepository, coreExplorer: CoreExplorerService) {
    this.walletRepository = walletRepository
    this.coreExplorer = coreExplorer
  }

  async handle (event: EventData): Promise<GetCoreAddressesInfosResponse> {
    const payload: GetCoreAddressesInfosPayload = event.payload

    if (payload.addresses.length === 0) {
      return { infos: [] }
    }

    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const network = wallet.network as NetworkType

    // One request for the whole batch. The service keeps the result aligned with
    // the addresses it was given, so a balance can never be paired with another
    // address, and fills unseen ones in as zeros.
    const infos = await this.coreExplorer.getAddressesInfo(payload.addresses, network)

    return {
      infos: infos.map(info => ({
        address: info.address,
        balance: info.balance.toString(),
        txCount: info.txCount
      }))
    }
  }

  validatePayload (payload: GetCoreAddressesInfosPayload): string | null {
    if (!Array.isArray(payload.addresses)) {
      return 'Addresses must be an array'
    }
    if (payload.addresses.some(address => typeof address !== 'string' || address.length === 0)) {
      return 'Each address must be a non-empty string'
    }

    return null
  }
}

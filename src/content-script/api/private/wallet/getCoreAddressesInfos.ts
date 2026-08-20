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

    // The explorer has no batch-by-address endpoint, so this is one request per
    // address. Results are mapped positionally off the same array the requests
    // were built from, so a balance can never be paired with another address.
    const infos = await Promise.all(payload.addresses.map(async (address) => {
      const info = await this.coreExplorer.getAddressInfo(address, network)

      return {
        address,
        balance: (info?.balance ?? 0n).toString(),
        received: (info?.received ?? 0n).toString(),
        sent: (info?.sent ?? 0n).toString(),
        txCount: info?.txCount ?? 0
      }
    }))

    return { infos }
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

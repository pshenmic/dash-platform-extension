import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'
import { WalletRepository } from '../../../repository/WalletRepository'
import { SwitchNetworkPayload } from '../../../../types/messages/payloads/SwitchNetworkPayload'
import { Network } from '../../../../types/enums/Network'
import { StorageAdapter } from '../../../storage/storageAdapter'

// Switches the extension to another network: the stored selection, the wallet
// that selection makes current, and the SDKs the backend talks to.
//
// Re-pointing the SDKs is handed back to whoever built this handler, because
// only the composition root can replace the core SDK - it is fixed to the
// network it was constructed with - and rebuild the handler table around it.
export class SwitchNetworkHandler implements APIHandler {
  walletRepository: WalletRepository
  storageAdapter: StorageAdapter
  setNetwork: (network: Network) => Promise<void>

  constructor (walletRepository: WalletRepository, storageAdapter: StorageAdapter, setNetwork: (network: Network) => Promise<void>) {
    this.walletRepository = walletRepository
    this.storageAdapter = storageAdapter
    this.setNetwork = setNetwork
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: SwitchNetworkPayload = event.payload
    const network = Network[payload.network]

    const currentNetwork = await this.storageAdapter.get('network')

    if (currentNetwork === payload.network) {
      return {}
    }

    await this.storageAdapter.set('network', network)

    const [wallet] = await this.walletRepository.getAll()

    await this.storageAdapter.set('currentWalletId', wallet?.walletId ?? null)

    // Last, so a failure above leaves the backend pointed where the stored
    // selection still says it is.
    await this.setNetwork(network)

    return {}
  }

  validatePayload (payload: SwitchNetworkPayload): string | null {
    if (Network[payload.network] == null) {
      return `Unknown network ${payload.network}`
    }

    return null
  }
}

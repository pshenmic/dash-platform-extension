import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'
import { WalletRepository } from '../../../repository/WalletRepository'
import { SwitchNetworkPayload } from '../../../../types/messages/payloads/SwitchNetworkPayload'
import { Network } from '../../../../types/enums/Network'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { DashPlatformSDK } from 'dash-platform-sdk'

export class SwitchNetworkHandler implements APIHandler {
  walletRepository: WalletRepository
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, storageAdapter: StorageAdapter, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.storageAdapter = storageAdapter
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: SwitchNetworkPayload = event.payload
    const network = Network[payload.network]

    const currentNetwork = await this.storageAdapter.get('network')

    if (currentNetwork === payload.network) {
      throw new Error('Cannot switch to the same network')
    }

    await this.storageAdapter.set('network', network)

    const [wallet] = await this.walletRepository.getAll()

    await this.storageAdapter.set('currentWalletId', wallet?.walletId ?? null)

    this.sdk.setNetwork(Network[payload.network])

    return {}
  }

  validatePayload (payload: SwitchNetworkPayload): string | null {
    if (Network[payload.network] == null) {
      return `Unknown network ${payload.network}`
    }

    return null
  }
}

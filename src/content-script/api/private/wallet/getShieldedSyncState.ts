import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { ShieldedService } from '../../../services/ShieldedService'
import { Network } from '../../../../types/enums/Network'
import { Wallet } from '../../../../types/Wallet'
import { GetShieldedSyncStatePayload } from '../../../../types/messages/payloads/GetShieldedSyncStatePayload'
import { GetShieldedSyncStateResponse } from '../../../../types/messages/response/GetShieldedSyncStateResponse'

// Serves what SYNC_SHIELDED_NOTES last recovered. Needs no password and makes no
// network call: everything comes from storage, which is what lets the UI show
// shielded funds right after unlocking. An account never synced comes back empty
// with `updatedAt` null; `phase` tells a running sync apart from that.
export class GetShieldedSyncStateHandler implements APIHandler {
  walletRepository: WalletRepository
  service: ShieldedService

  constructor (walletRepository: WalletRepository, service: ShieldedService) {
    this.walletRepository = walletRepository
    this.service = service
  }

  async handle (event: EventData): Promise<GetShieldedSyncStateResponse> {
    const payload: GetShieldedSyncStatePayload = event.payload ?? {}
    const account = payload.account ?? 0

    const wallet = await this.selectWallet(payload)

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const stored = await this.service
      .repository({ walletId: wallet.walletId, network: wallet.network })
      .get(account)

    return this.service.syncState(wallet, stored ?? this.service.emptyAccount(account), stored != null)
  }

  // The selected wallet by default; a named wallet, or one on the other network,
  // is looked up in that network's records.
  private async selectWallet (payload: GetShieldedSyncStatePayload): Promise<Wallet | null> {
    if (payload.walletId == null && payload.network == null) {
      return await this.walletRepository.getCurrent()
    }

    const network = payload.network ?? (await this.walletRepository.getCurrent())?.network

    if (network == null) {
      return null
    }

    const wallets = await this.walletRepository.getAllForNetwork(network)
    const walletId = payload.walletId ?? (await this.walletRepository.getCurrent())?.walletId

    return wallets.find(candidate => candidate.walletId === walletId) ?? null
  }

  validatePayload (payload: GetShieldedSyncStatePayload): string | null {
    if (payload?.network != null && Network[payload.network] == null) {
      return `Unknown network ${String(payload.network)}`
    }

    return this.service.validateAccount(payload?.account)
  }
}

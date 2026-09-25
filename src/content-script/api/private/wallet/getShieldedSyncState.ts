import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { ShieldedService } from '../../../services/ShieldedService'
import { GetShieldedSyncStatePayload } from '../../../../types/messages/payloads/GetShieldedSyncStatePayload'
import { GetShieldedSyncStateResponse } from '../../../../types/messages/response/GetShieldedSyncStateResponse'

// Serves what SYNC_SHIELDED_NOTES last recovered. Needs no password and makes no
// network call: everything comes from storage, which is what lets the UI show
// shielded funds right after unlocking. An account never synced comes back empty
// with `updatedAt` null rather than as an error.
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

    const wallet = payload.walletId != null
      ? (await this.walletRepository.getAll()).find(candidate => candidate.walletId === payload.walletId) ?? null
      : await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const stored = await this.service
      .repository({ walletId: wallet.walletId, network: wallet.network })
      .get(account)

    return this.service.syncState(wallet.walletId, stored ?? this.service.emptyAccount(account), stored != null)
  }

  validatePayload (payload: GetShieldedSyncStatePayload): string | null {
    return this.service.validateAccount(payload?.account)
  }
}

import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { ShieldedCacheService } from '../../../services/ShieldedCacheService'
import { GetShieldedCachePayload } from '../../../../types/messages/payloads/GetShieldedCachePayload'
import { GetShieldedCacheResponse } from '../../../../types/messages/response/GetShieldedCacheResponse'
import { emptyShieldedCache, shieldedCacheResponse, validateShieldedCacheAccount } from './shieldedCachePayload'

// Serves what SYNC_SHIELDED_CACHE last recovered. Needs no password and makes no
// network call: everything comes from storage, which is what lets the UI show
// shielded funds right after unlocking. An account never synced comes back empty
// with `updatedAt` null rather than as an error.
export class GetShieldedCacheHandler implements APIHandler {
  walletRepository: WalletRepository
  service: ShieldedCacheService

  constructor (walletRepository: WalletRepository, service: ShieldedCacheService) {
    this.walletRepository = walletRepository
    this.service = service
  }

  async handle (event: EventData): Promise<GetShieldedCacheResponse> {
    const payload: GetShieldedCachePayload = event.payload ?? {}
    const account = payload.account ?? 0

    const wallet = payload.walletId != null
      ? (await this.walletRepository.getAll()).find(candidate => candidate.walletId === payload.walletId) ?? null
      : await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const cache = await this.service
      .repository({ walletId: wallet.walletId, network: wallet.network })
      .get(account)

    return shieldedCacheResponse(wallet.walletId, cache ?? emptyShieldedCache(account), cache != null)
  }

  validatePayload (payload: GetShieldedCachePayload): string | null {
    return validateShieldedCacheAccount(payload?.account)
  }
}

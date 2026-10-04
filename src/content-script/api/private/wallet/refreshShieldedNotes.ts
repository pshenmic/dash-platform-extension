import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { ShieldedService } from '../../../services/ShieldedService'
import { Wallet } from '../../../../types/Wallet'
import { Network } from '../../../../types/enums/Network'
import { NetworkType } from '../../../../types/NetworkType'
import { RefreshShieldedNotesPayload } from '../../../../types/messages/payloads/RefreshShieldedNotesPayload'
import { ShieldedSyncState, SyncShieldedNotesResponse } from '../../../../types/messages/response/GetShieldedSyncStateResponse'

// Updates what can be updated without the password, for a dashboard refresh
// button: the stored notes are re-checked against the nullifier index (a spend
// made elsewhere shows up, and the balance drops) and the pool size is re-read.
//
// Notes that appeared since the last sync are NOT recovered — trial-decryption
// needs the seed. They are counted in `total`, so a caller comparing it with
// `fetched` can tell the user a full sync would find more.
export class RefreshShieldedNotesHandler implements APIHandler {
  walletRepository: WalletRepository
  service: ShieldedService

  constructor (walletRepository: WalletRepository, service: ShieldedService) {
    this.walletRepository = walletRepository
    this.service = service
  }

  async handle (event: EventData): Promise<SyncShieldedNotesResponse> {
    const payload: RefreshShieldedNotesPayload = event.payload ?? {}
    const account = payload.account ?? 0
    const networks = payload.network != null ? [payload.network] : Object.values(Network)

    const entries: Array<ShieldedSyncState & { error?: string }> = []

    for (const network of networks) {
      entries.push(...await this.refreshNetwork(network, account, payload.walletId))
    }

    return { wallets: entries }
  }

  private async refreshNetwork (network: NetworkType, account: number, walletId?: string): Promise<Array<ShieldedSyncState & { error?: string }>> {
    const wallets = (await this.walletRepository.getAllForNetwork(network))
      .filter(wallet => walletId == null || wallet.walletId === walletId)

    const entries: Array<ShieldedSyncState & { error?: string }> = []
    const service = this.service.forNetwork(network)

    for (const wallet of wallets) {
      const repository = service.repository({ walletId: wallet.walletId, network: wallet.network })
      const stored = await repository.get(account)

      // Nothing was ever synced for this wallet, and without the password there
      // is nothing to build from, so it is left alone.
      if (stored == null) {
        continue
      }

      try {
        entries.push(await this.refreshWallet(service, wallet, account))
      } catch (error) {
        entries.push({
          ...service.syncState(wallet, stored, true),
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    return entries
  }

  // Under the wallet's lock, so a refresh cannot overwrite what a sync running at
  // the same time has just recovered.
  private async refreshWallet (service: ShieldedService, wallet: Wallet, account: number): Promise<ShieldedSyncState> {
    const repository = service.repository({ walletId: wallet.walletId, network: wallet.network })

    return await repository.withLock(async () => {
      const stored = await repository.get(account)

      if (stored == null) {
        throw new Error('Shielded notes are no longer stored for this wallet')
      }

      const next = await service.refreshStored(stored)
      await repository.save(next)

      return service.syncState(wallet, next, true)
    })
  }

  validatePayload (payload: RefreshShieldedNotesPayload): string | null {
    if (payload?.network != null && Network[payload.network] == null) {
      return `Unknown network ${String(payload.network)}`
    }

    return this.service.validateAccount(payload?.account)
  }
}
